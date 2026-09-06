import { Router } from "express";
import { budgetWarnings } from "../lib/budget";
import { formatRef } from "../lib/format-ref";
import { getJournalByName, postVendorBill } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";

const router = Router();

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

// Shape a validated line for a Prisma `create`, normalising the optional analytic tag.
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

router.get("/", async (_req, res) => {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: { lines: { include: { analyticAccount: true } }, vendor: true },
    orderBy: { date: "desc" },
  });

  res.json(
    purchaseOrders.map((po) => ({
      ...po,
      refNumber: formatRef("PO", po.refNumber),
      lines: po.lines.map(serializeLine),
    })),
  );
});

router.get("/:id", async (req, res) => {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: {
      lines: { include: { product: true, analyticAccount: true } },
      vendor: true,
      vendorBills: true,
    },
  });

  if (!purchaseOrder) {
    return res.status(404).json({ error: "purchase order not found" });
  }

  res.json({
    ...purchaseOrder,
    refNumber: formatRef("PO", purchaseOrder.refNumber),
    lines: purchaseOrder.lines.map(serializeLine),
    vendorBills: purchaseOrder.vendorBills.map((bill) => ({
      ...bill,
      refNumber: formatRef("BILL", bill.refNumber, bill.date),
      amount: bill.amount.toNumber(),
      amountDue: bill.amountDue.toNumber(),
    })),
  });
});

function validateBody(body: Record<string, unknown>) {
  if (typeof body.vendorId !== "string" || body.vendorId.length === 0) {
    return { error: "vendorId is required" as const };
  }
  if (typeof body.date !== "string" || Number.isNaN(Date.parse(body.date))) {
    return { error: "a valid date is required" as const };
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0 || !body.lines.every(isValidLine)) {
    return {
      error: "at least one line is required, each with productId, quantity, and unitPrice" as const,
    };
  }
  return { vendorId: body.vendorId, date: new Date(body.date), lines: body.lines as LineInput[] };
}

router.post("/", async (req, res) => {
  const parsed = validateBody(req.body ?? {});
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      vendorId: parsed.vendorId,
      date: parsed.date,
      lines: { create: parsed.lines.map(lineCreateData) },
    },
    include: { lines: true },
  });

  const warnings = await budgetWarnings(
    purchaseOrder.lines.map((l) => ({
      analyticAccountId: l.analyticAccountId,
      amount: l.quantity.toNumber() * l.unitPrice.toNumber(),
    })),
    "Expenses",
    purchaseOrder.date,
  );

  res.status(201).json({
    ...purchaseOrder,
    refNumber: formatRef("PO", purchaseOrder.refNumber),
    lines: purchaseOrder.lines.map(serializeLine),
    budgetWarnings: warnings,
  });
});

// Replaces vendor/date/lines wholesale — only permitted while the PO is still Draft,
// since a Billed PO has already generated a VendorBill from its current line amounts.
router.put("/:id", async (req, res) => {
  const parsed = validateBody(req.body ?? {});
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: "purchase order not found" });
  }
  if (existing.status !== "Draft") {
    return res.status(400).json({ error: "only a Draft purchase order can be edited" });
  }

  const purchaseOrder = await prisma.$transaction(async (tx) => {
    await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: existing.id } });
    return tx.purchaseOrder.update({
      where: { id: existing.id },
      data: {
        vendorId: parsed.vendorId,
        date: parsed.date,
        lines: { create: parsed.lines.map(lineCreateData) },
      },
      include: { lines: true },
    });
  });

  res.json({
    ...purchaseOrder,
    refNumber: formatRef("PO", purchaseOrder.refNumber),
    lines: purchaseOrder.lines.map(serializeLine),
  });
});

// Draft -> Confirmed. The non-blocking budget warning fires here (wireframe:
// "Non Blocking Warning on Confirmation of PO"). A Confirmed PO can no longer be
// edited but can still be converted to a bill.
router.post("/:id/confirm", async (req, res) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: { lines: true },
  });
  if (!po) return res.status(404).json({ error: "purchase order not found" });
  if (po.status !== "Draft") {
    return res.status(400).json({ error: "only a Draft purchase order can be confirmed" });
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: "Confirmed" },
    include: { lines: true },
  });

  const warnings = await budgetWarnings(
    po.lines.map((l) => ({
      analyticAccountId: l.analyticAccountId,
      amount: l.quantity.toNumber() * l.unitPrice.toNumber(),
    })),
    "Expenses",
    po.date,
  );

  res.json({
    ...updated,
    refNumber: formatRef("PO", updated.refNumber),
    lines: updated.lines.map(serializeLine),
    budgetWarnings: warnings,
  });
});

// Converts a Draft/Confirmed PO into a VendorBill and immediately posts it (Debit
// Purchase Expense / Credit Creditors) via postVendorBill() — never bypass the
// engine here. Line-level Budget Analytics tags are carried over onto the bill's lines.
router.post("/:id/convert-to-bill", async (req, res) => {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: { lines: true },
  });

  if (!purchaseOrder) {
    return res.status(404).json({ error: "purchase order not found" });
  }
  if (purchaseOrder.status === "Billed") {
    return res.status(400).json({ error: "purchase order has already been converted to a bill" });
  }

  const amount = purchaseOrder.lines.reduce(
    (sum, line) => sum + line.quantity.toNumber() * line.unitPrice.toNumber(),
    0,
  );
  const billDate = new Date();

  const vendorBill = await prisma.vendorBill.create({
    data: {
      purchaseOrderId: purchaseOrder.id,
      vendorId: purchaseOrder.vendorId,
      date: billDate,
      amount,
      amountDue: amount,
      status: "Draft",
      lines: {
        create: purchaseOrder.lines.map((line) => ({
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
    vendorBill.lines.map((l) => ({
      analyticAccountId: l.analyticAccountId,
      amount: l.quantity.toNumber() * l.unitPrice.toNumber(),
    })),
    "Expenses",
    billDate,
  );

  const purchaseJournal = await getJournalByName("Purchase Journal");

  await postVendorBill({
    journalId: purchaseJournal.id,
    vendorId: purchaseOrder.vendorId,
    amount,
    date: billDate,
    reference: `PO ${formatRef("PO", purchaseOrder.refNumber)}`,
    sourceId: vendorBill.id,
  });

  await prisma.purchaseOrder.update({
    where: { id: purchaseOrder.id },
    data: { status: "Billed" },
  });

  res.status(201).json({
    ...vendorBill,
    refNumber: formatRef("BILL", vendorBill.refNumber, vendorBill.date),
    amount: vendorBill.amount.toNumber(),
    amountDue: vendorBill.amountDue.toNumber(),
    lines: vendorBill.lines.map(serializeLine),
    budgetWarnings: warnings,
  });
});

export default router;
