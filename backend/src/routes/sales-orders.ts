import { Router } from "express";
import { budgetWarnings } from "../lib/budget";
import { formatRef } from "../lib/format-ref";
import { getJournalByName, postCustomerInvoice } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";

const router = Router();

// Flat rate applied to every generated invoice's base amount.
const GST_RATE = 0.18;

// Optional "Budget Analytics" tag — a non-empty string id or null.
function parseAnalyticAccountId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

interface LineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
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
    l.unitPrice >= 0
  );
}

router.get("/", async (_req, res) => {
  const salesOrders = await prisma.salesOrder.findMany({
    include: { lines: true, customer: true, analyticAccount: true },
    orderBy: { date: "desc" },
  });

  res.json(
    salesOrders.map((so) => ({
      ...so,
      refNumber: formatRef("SO", so.refNumber),
      lines: so.lines.map((line) => ({
        ...line,
        quantity: line.quantity.toNumber(),
        unitPrice: line.unitPrice.toNumber(),
      })),
    })),
  );
});

router.get("/:id", async (req, res) => {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id: req.params.id },
    include: {
      lines: { include: { product: true } },
      customer: true,
      invoices: true,
      analyticAccount: true,
    },
  });

  if (!salesOrder) {
    return res.status(404).json({ error: "sales order not found" });
  }

  res.json({
    ...salesOrder,
    refNumber: formatRef("SO", salesOrder.refNumber),
    lines: salesOrder.lines.map((line) => ({
      ...line,
      quantity: line.quantity.toNumber(),
      unitPrice: line.unitPrice.toNumber(),
    })),
    invoices: salesOrder.invoices.map((invoice) => ({
      ...invoice,
      refNumber: formatRef("INV", invoice.refNumber),
      baseAmount: invoice.baseAmount.toNumber(),
      taxAmount: invoice.taxAmount.toNumber(),
      amount: invoice.amount.toNumber(),
      amountDue: invoice.amountDue.toNumber(),
    })),
  });
});

router.post("/", async (req, res) => {
  const { customerId, date, lines } = req.body;
  const analyticAccountId = parseAnalyticAccountId(req.body.analyticAccountId);

  if (typeof customerId !== "string" || customerId.length === 0) {
    return res.status(400).json({ error: "customerId is required" });
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "a valid date is required" });
  }
  if (!Array.isArray(lines) || lines.length === 0 || !lines.every(isValidLine)) {
    return res.status(400).json({
      error: "at least one line is required, each with productId, quantity, and unitPrice",
    });
  }

  const salesOrder = await prisma.salesOrder.create({
    data: {
      customerId,
      date: new Date(date),
      analyticAccountId,
      lines: {
        create: lines.map((line: LineInput) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      },
    },
    include: { lines: true },
  });

  const netTotal = salesOrder.lines.reduce(
    (sum, line) => sum + line.quantity.toNumber() * line.unitPrice.toNumber(),
    0,
  );

  res.status(201).json({
    ...salesOrder,
    refNumber: formatRef("SO", salesOrder.refNumber),
    lines: salesOrder.lines.map((line) => ({
      ...line,
      quantity: line.quantity.toNumber(),
      unitPrice: line.unitPrice.toNumber(),
    })),
    budgetWarnings: await budgetWarnings(analyticAccountId, "Income", netTotal, salesOrder.date),
  });
});

// Replaces customer/date/lines wholesale — only permitted while the SO is still Draft,
// since an Invoiced SO has already generated a CustomerInvoice from its current line amounts.
router.put("/:id", async (req, res) => {
  const { customerId, date, lines } = req.body;
  const analyticAccountId = parseAnalyticAccountId(req.body.analyticAccountId);

  if (typeof customerId !== "string" || customerId.length === 0) {
    return res.status(400).json({ error: "customerId is required" });
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "a valid date is required" });
  }
  if (!Array.isArray(lines) || lines.length === 0 || !lines.every(isValidLine)) {
    return res.status(400).json({
      error: "at least one line is required, each with productId, quantity, and unitPrice",
    });
  }

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
        customerId,
        date: new Date(date),
        analyticAccountId,
        lines: {
          create: lines.map((line: LineInput) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        },
      },
      include: { lines: true },
    });
  });

  res.json({
    ...salesOrder,
    refNumber: formatRef("SO", salesOrder.refNumber),
    lines: salesOrder.lines.map((line) => ({
      ...line,
      quantity: line.quantity.toNumber(),
      unitPrice: line.unitPrice.toNumber(),
    })),
  });
});

// Converts a Draft SO into a CustomerInvoice (base amount + 18% GST) and immediately
// posts it (Debit Debtors / Credit Sales Income + Credit Tax Payable) via
// postCustomerInvoice() — never bypass the engine here.
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

  const invoice = await prisma.customerInvoice.create({
    data: {
      salesOrderId: salesOrder.id,
      customerId: salesOrder.customerId,
      date: new Date(),
      baseAmount,
      taxAmount,
      amount,
      amountDue: amount,
      status: "Draft",
      analyticAccountId: salesOrder.analyticAccountId,
    },
  });

  const warnings = await budgetWarnings(salesOrder.analyticAccountId, "Income", baseAmount, invoice.date);

  const salesJournal = await getJournalByName("Sales Journal");

  await postCustomerInvoice({
    journalId: salesJournal.id,
    customerId: salesOrder.customerId,
    baseAmount,
    taxAmount,
    date: invoice.date,
    reference: `SO ${formatRef("SO", salesOrder.refNumber)}`,
    sourceId: invoice.id,
  });

  await prisma.salesOrder.update({
    where: { id: salesOrder.id },
    data: { status: "Invoiced" },
  });

  res.status(201).json({
    ...invoice,
    refNumber: formatRef("INV", invoice.refNumber),
    baseAmount: invoice.baseAmount.toNumber(),
    taxAmount: invoice.taxAmount.toNumber(),
    amount: invoice.amount.toNumber(),
    amountDue: invoice.amountDue.toNumber(),
    budgetWarnings: warnings,
  });
});

export default router;
