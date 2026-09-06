import { Router } from "express";
import { budgetWarnings } from "../lib/budget";
import { formatRef } from "../lib/format-ref";
import { getJournalByName, postCustomerInvoice } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";

const router = Router();

// Flat rate applied to every generated invoice's base amount.
const GST_RATE = 0.18;

interface LineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  analyticAccountId?: string | null;
}

function isValidLine(line: unknown): line is LineInput {
  if (typeof line !== "object" || line === null) return false;
  const l = line as Record<string, unknown>;
  return (
    typeof l.productId === "string" &&
    l.productId.length > 0 &&
    typeof l.quantity === "number" &&
    l.quantity > 0 &&
    typeof l.unitPrice === "number" &&
    l.unitPrice >= 0 &&
    (l.analyticAccountId == null || typeof l.analyticAccountId === "string")
  );
}

function lineCreateData(line: LineInput) {
  return {
    productId: line.productId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    analyticAccountId:
      typeof line.analyticAccountId === "string" && line.analyticAccountId.length > 0
        ? line.analyticAccountId
        : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeLine(line: any) {
  return {
    ...line,
    quantity: line.quantity.toNumber(),
    unitPrice: line.unitPrice.toNumber(),
  };
}

function validateBody(body: Record<string, unknown>) {
  if (typeof body.customerId !== "string" || body.customerId.length === 0) {
    return { error: "customerId is required" as const };
  }
  if (typeof body.date !== "string" || Number.isNaN(Date.parse(body.date))) {
    return { error: "a valid date is required" as const };
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0 || !body.lines.every(isValidLine)) {
    return {
      error: "at least one line is required, each with productId, quantity, and unitPrice" as const,
    };
  }
  return { customerId: body.customerId, date: new Date(body.date), lines: body.lines as LineInput[] };
}

router.get("/", async (_req, res) => {
  const salesOrders = await prisma.salesOrder.findMany({
    include: { lines: { include: { analyticAccount: true } }, customer: true },
    orderBy: { date: "desc" },
  });

  res.json(
    salesOrders.map((so) => ({
      ...so,
      refNumber: formatRef("SO", so.refNumber),
      lines: so.lines.map(serializeLine),
    })),
  );
});

router.get("/:id", async (req, res) => {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id: req.params.id },
    include: {
      lines: { include: { product: true, analyticAccount: true } },
      customer: true,
      invoices: true,
    },
  });

  if (!salesOrder) {
    return res.status(404).json({ error: "sales order not found" });
  }

  res.json({
    ...salesOrder,
    refNumber: formatRef("SO", salesOrder.refNumber),
    lines: salesOrder.lines.map(serializeLine),
    invoices: salesOrder.invoices.map((invoice) => ({
      ...invoice,
      refNumber: formatRef("INV", invoice.refNumber, invoice.date),
      baseAmount: invoice.baseAmount.toNumber(),
      taxAmount: invoice.taxAmount.toNumber(),
      amount: invoice.amount.toNumber(),
      amountDue: invoice.amountDue.toNumber(),
    })),
  });
});

router.post("/", async (req, res) => {
  const parsed = validateBody(req.body ?? {});
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  const salesOrder = await prisma.salesOrder.create({
    data: {
      customerId: parsed.customerId,
      date: parsed.date,
      lines: { create: parsed.lines.map(lineCreateData) },
    },
    include: { lines: true },
  });

  const warnings = await budgetWarnings(
    salesOrder.lines.map((l) => ({
      analyticAccountId: l.analyticAccountId,
      amount: l.quantity.toNumber() * l.unitPrice.toNumber(),
    })),
    "Income",
    salesOrder.date,
  );

  res.status(201).json({
    ...salesOrder,
    refNumber: formatRef("SO", salesOrder.refNumber),
    lines: salesOrder.lines.map(serializeLine),
    budgetWarnings: warnings,
  });
});

// Replaces customer/date/lines wholesale — only permitted while the SO is still Draft,
// since an Invoiced SO has already generated a CustomerInvoice from its current line amounts.
router.put("/:id", async (req, res) => {
  const parsed = validateBody(req.body ?? {});
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  const existing = await prisma.salesOrder.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: "sales order not found" });
  }
  if (existing.status !== "Draft") {
    return res.status(400).json({ error: "only a Draft sales order can be edited" });
  }

  const salesOrder = await prisma.$transaction(async (tx) => {
    await tx.salesOrderLine.deleteMany({ where: { salesOrderId: existing.id } });
    return tx.salesOrder.update({
      where: { id: existing.id },
      data: {
        customerId: parsed.customerId,
        date: parsed.date,
        lines: { create: parsed.lines.map(lineCreateData) },
      },
      include: { lines: true },
    });
  });

  res.json({
    ...salesOrder,
    refNumber: formatRef("SO", salesOrder.refNumber),
    lines: salesOrder.lines.map(serializeLine),
  });
});

// Draft -> Confirmed. The non-blocking budget warning fires here. A Confirmed SO
// can no longer be edited but can still be turned into an invoice.
router.post("/:id/confirm", async (req, res) => {
  const so = await prisma.salesOrder.findUnique({
    where: { id: req.params.id },
    include: { lines: true },
  });
  if (!so) return res.status(404).json({ error: "sales order not found" });
  if (so.status !== "Draft") {
    return res.status(400).json({ error: "only a Draft sales order can be confirmed" });
  }

  const updated = await prisma.salesOrder.update({
    where: { id: so.id },
    data: { status: "Confirmed" },
    include: { lines: true },
  });

  const warnings = await budgetWarnings(
    so.lines.map((l) => ({
      analyticAccountId: l.analyticAccountId,
      amount: l.quantity.toNumber() * l.unitPrice.toNumber(),
    })),
    "Income",
    so.date,
  );

  res.json({
    ...updated,
    refNumber: formatRef("SO", updated.refNumber),
    lines: updated.lines.map(serializeLine),
    budgetWarnings: warnings,
  });
});

// Converts a Draft/Confirmed SO into a CustomerInvoice (base amount + 18% GST) and
// immediately posts it (Debit Debtors / Credit Sales Income + Credit Tax Payable) via
// postCustomerInvoice() — never bypass the engine here. Line-level Budget Analytics
// tags are carried over onto the invoice's lines.
router.post("/:id/generate-invoice", async (req, res) => {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id: req.params.id },
    include: { lines: true },
  });

  if (!salesOrder) {
    return res.status(404).json({ error: "sales order not found" });
  }
  if (salesOrder.status === "Invoiced") {
    return res.status(400).json({ error: "sales order has already been invoiced" });
  }

  const baseAmount = salesOrder.lines.reduce(
    (sum, line) => sum + line.quantity.toNumber() * line.unitPrice.toNumber(),
    0,
  );
  const taxAmount = Math.round(baseAmount * GST_RATE * 100) / 100;
  const amount = baseAmount + taxAmount;
  const invoiceDate = new Date();

  const invoice = await prisma.customerInvoice.create({
    data: {
      salesOrderId: salesOrder.id,
      customerId: salesOrder.customerId,
      date: invoiceDate,
      baseAmount,
      taxAmount,
      amount,
      amountDue: amount,
      status: "Draft",
      lines: {
        create: salesOrder.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          analyticAccountId: line.analyticAccountId,
        })),
      },
    },
    include: { lines: true },
  });

  const warnings = await budgetWarnings(
    invoice.lines.map((l) => ({
      analyticAccountId: l.analyticAccountId,
      amount: l.quantity.toNumber() * l.unitPrice.toNumber(),
    })),
    "Income",
    invoiceDate,
  );

  const salesJournal = await getJournalByName("Sales Journal");

  await postCustomerInvoice({
    journalId: salesJournal.id,
    customerId: salesOrder.customerId,
    baseAmount,
    taxAmount,
    date: invoiceDate,
    reference: `SO ${formatRef("SO", salesOrder.refNumber)}`,
    sourceId: invoice.id,
  });

  await prisma.salesOrder.update({
    where: { id: salesOrder.id },
    data: { status: "Invoiced" },
  });

  res.status(201).json({
    ...invoice,
    refNumber: formatRef("INV", invoice.refNumber, invoice.date),
    baseAmount: invoice.baseAmount.toNumber(),
    taxAmount: invoice.taxAmount.toNumber(),
    amount: invoice.amount.toNumber(),
    amountDue: invoice.amountDue.toNumber(),
    lines: invoice.lines.map(serializeLine),
    budgetWarnings: warnings,
  });
});

export default router;
