import { Router } from "express";
import { getJournalByName, postVendorBill } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";

const router = Router();

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

router.post("/", async (req, res) => {
  const { vendorId, date, lines } = req.body;

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

  res.status(201).json({
    ...purchaseOrder,
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
    },
  });

  const purchaseJournal = await getJournalByName("Purchase Journal");

  await postVendorBill({
    journalId: purchaseJournal.id,
    vendorId: purchaseOrder.vendorId,
    amount,
    date: vendorBill.date,
    reference: `PO ${purchaseOrder.id}`,
    sourceId: vendorBill.id,
  });

  await prisma.purchaseOrder.update({
    where: { id: purchaseOrder.id },
    data: { status: "Billed" },
  });

  res.status(201).json({
    ...vendorBill,
    amount: vendorBill.amount.toNumber(),
    amountDue: vendorBill.amountDue.toNumber(),
  });
});

export default router;
