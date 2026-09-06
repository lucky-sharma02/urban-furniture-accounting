import { Router } from "express";
import { budgetWarnings } from "../lib/budget";
import { formatRef } from "../lib/format-ref";
import { getJournalByName, postVendorBill } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";

const router = Router();

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
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: { lines: true, vendor: true, analyticAccount: true },
    orderBy: { date: "desc" },
  });

  res.json(
    purchaseOrders.map((po) => ({
      ...po,
      refNumber: formatRef("PO", po.refNumber),
      lines: po.lines.map((line) => ({
        ...line,
        quantity: line.quantity.toNumber(),
        unitPrice: line.unitPrice.toNumber(),
      })),
    })),
  );
});

router.get("/:id", async (req, res) => {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: {
      lines: { include: { product: true } },
      vendor: true,
      vendorBills: true,
      analyticAccount: true,
    },
  });

  if (!purchaseOrder) {
    return res.status(404).json({ error: "purchase order not found" });
  }

  res.json({
    ...purchaseOrder,
    refNumber: formatRef("PO", purchaseOrder.refNumber),
    lines: purchaseOrder.lines.map((line) => ({
      ...line,
      quantity: line.quantity.toNumber(),
      unitPrice: line.unitPrice.toNumber(),
    })),
    vendorBills: purchaseOrder.vendorBills.map((bill) => ({
      ...bill,
      refNumber: formatRef("BILL", bill.refNumber),
      amount: bill.amount.toNumber(),
      amountDue: bill.amountDue.toNumber(),
    })),
  });
});

router.post("/", async (req, res) => {
  const { vendorId, date, lines } = req.body;
  const analyticAccountId = parseAnalyticAccountId(req.body.analyticAccountId);

  if (typeof vendorId !== "string" || vendorId.length === 0) {
    return res.status(400).json({ error: "vendorId is required" });
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "a valid date is required" });
  }
  if (!Array.isArray(lines) || lines.length === 0 || !lines.every(isValidLine)) {
    return res.status(400).json({
      error: "at least one line is required, each with productId, quantity, and unitPrice",
    });
  }

  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      vendorId,
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

  const total = purchaseOrder.lines.reduce(
    (sum, line) => sum + line.quantity.toNumber() * line.unitPrice.toNumber(),
    0,
  );

  res.status(201).json({
    ...purchaseOrder,
    refNumber: formatRef("PO", purchaseOrder.refNumber),
    lines: purchaseOrder.lines.map((line) => ({
      ...line,
      quantity: line.quantity.toNumber(),
      unitPrice: line.unitPrice.toNumber(),
    })),
    budgetWarnings: await budgetWarnings(analyticAccountId, "Expenses", total, purchaseOrder.date),
  });
});

// Replaces vendor/date/lines wholesale — only permitted while the PO is still Draft,
// since a Billed PO has already generated a VendorBill from its current line amounts.
router.put("/:id", async (req, res) => {
  const { vendorId, date, lines } = req.body;
  const analyticAccountId = parseAnalyticAccountId(req.body.analyticAccountId);

  if (typeof vendorId !== "string" || vendorId.length === 0) {
    return res.status(400).json({ error: "vendorId is required" });
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "a valid date is required" });
  }
  if (!Array.isArray(lines) || lines.length === 0 || !lines.every(isValidLine)) {
    return res.status(400).json({
      error: "at least one line is required, each with productId, quantity, and unitPrice",
    });
  }

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
        vendorId,
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
    ...purchaseOrder,
    refNumber: formatRef("PO", purchaseOrder.refNumber),
    lines: purchaseOrder.lines.map((line) => ({
      ...line,
      quantity: line.quantity.toNumber(),
      unitPrice: line.unitPrice.toNumber(),
    })),
  });
});

// Converts a Draft PO into a VendorBill and immediately posts it (Debit Purchase
// Expense / Credit Creditors) via postVendorBill() — never bypass the engine here.
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

  const vendorBill = await prisma.vendorBill.create({
    data: {
      purchaseOrderId: purchaseOrder.id,
      vendorId: purchaseOrder.vendorId,
      date: new Date(),
      amount,
      amountDue: amount,
      status: "Draft",
      analyticAccountId: purchaseOrder.analyticAccountId,
    },
  });

  const warnings = await budgetWarnings(
    purchaseOrder.analyticAccountId,
    "Expenses",
    amount,
    vendorBill.date,
  );

  const purchaseJournal = await getJournalByName("Purchase Journal");

  await postVendorBill({
    journalId: purchaseJournal.id,
    vendorId: purchaseOrder.vendorId,
    amount,
    date: vendorBill.date,
    reference: `PO ${formatRef("PO", purchaseOrder.refNumber)}`,
    sourceId: vendorBill.id,
  });

  await prisma.purchaseOrder.update({
    where: { id: purchaseOrder.id },
    data: { status: "Billed" },
  });

  res.status(201).json({
    ...vendorBill,
    refNumber: formatRef("BILL", vendorBill.refNumber),
    amount: vendorBill.amount.toNumber(),
    amountDue: vendorBill.amountDue.toNumber(),
    budgetWarnings: warnings,
  });
});

export default router;
