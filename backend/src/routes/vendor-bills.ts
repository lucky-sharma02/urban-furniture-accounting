import { Router } from "express";
import { getJournalByName, postVendorBill, postVendorPayment } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";

const router = Router();

// Rounds to cents before comparing so floating point noise never causes a bill
// to be left a fraction of a paisa short of "Paid" after repeated partial payments.
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// Create a Vendor Bill directly, with no backing Purchase Order.
router.post("/", async (req, res) => {
  const { vendorId, date, amount } = req.body;

  if (typeof vendorId !== "string" || vendorId.length === 0) {
    return res.status(400).json({ error: "vendorId is required" });
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "a valid date is required" });
  }
  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  const billDate = new Date(date);

  const vendorBill = await prisma.vendorBill.create({
    data: {
      purchaseOrderId: null,
      vendorId,
      date: billDate,
      amount,
      amountDue: amount,
      status: "Draft",
    },
  });

  const purchaseJournal = await getJournalByName("Purchase Journal");

  await postVendorBill({
    journalId: purchaseJournal.id,
    vendorId,
    amount,
    date: billDate,
    reference: "Direct Bill (no PO)",
    sourceId: vendorBill.id,
  });

  res.status(201).json({
    ...vendorBill,
    amount: vendorBill.amount.toNumber(),
    amountDue: vendorBill.amountDue.toNumber(),
  });
});

// Records a (possibly partial) payment against a bill, recalculates amountDue,
// transitions status Draft -> Partial -> Paid, and posts the payment (Debit
// Creditors / Credit Bank or Cash) via postVendorPayment().
router.post("/:id/payments", async (req, res) => {
  const { amount, date, paymentAccountId } = req.body;

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "a valid date is required" });
  }
  if (typeof paymentAccountId !== "string" || paymentAccountId.length === 0) {
    return res.status(400).json({ error: "paymentAccountId is required" });
  }

  const vendorBill = await prisma.vendorBill.findUnique({ where: { id: req.params.id } });
  if (!vendorBill) {
    return res.status(404).json({ error: "vendor bill not found" });
  }

  const amountDue = vendorBill.amountDue.toNumber();
  if (toCents(amount) > toCents(amountDue)) {
    return res.status(400).json({ error: `payment of ${amount} exceeds amount due of ${amountDue}` });
  }

  const paymentDate = new Date(date);

  const payment = await prisma.payment.create({
    data: {
      vendorBillId: vendorBill.id,
      amount,
      date: paymentDate,
      paymentAccountId,
    },
  });

  const newAmountDue = Math.max(0, toCents(amountDue) - toCents(amount)) / 100;
  const newStatus = newAmountDue === 0 ? "Paid" : "Partial";

  const updatedBill = await prisma.vendorBill.update({
    where: { id: vendorBill.id },
    data: { amountDue: newAmountDue, status: newStatus },
  });

  const purchaseJournal = await getJournalByName("Purchase Journal");

  await postVendorPayment({
    journalId: purchaseJournal.id,
    vendorId: vendorBill.vendorId,
    amount,
    date: paymentDate,
    reference: `Payment for bill ${vendorBill.id}`,
    sourceId: payment.id,
    paymentAccountId,
  });

  res.status(201).json({
    payment: { ...payment, amount: payment.amount.toNumber() },
    vendorBill: {
      ...updatedBill,
      amount: updatedBill.amount.toNumber(),
      amountDue: updatedBill.amountDue.toNumber(),
    },
  });
});

export default router;
