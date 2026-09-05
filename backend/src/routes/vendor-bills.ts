import { Router } from "express";
import { formatRef } from "../lib/format-ref";
import { getJournalByName, postVendorBill, postVendorPayment } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";
import { isContactUser, ownsRecord, scopeWhere } from "../middleware/portal-scope";

const router = Router();

// Rounds to cents before comparing so floating point noise never causes a bill
// to be left a fraction of a paisa short of "Paid" after repeated partial payments.
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

router.get("/", async (req, res) => {
  const vendorBills = await prisma.vendorBill.findMany({
    where: scopeWhere(req, "vendorId"),
    include: { vendor: true },
    orderBy: { date: "desc" },
  });

  res.json(
    vendorBills.map((bill) => ({
      ...bill,
      refNumber: formatRef("BILL", bill.refNumber),
      amount: bill.amount.toNumber(),
      amountDue: bill.amountDue.toNumber(),
    })),
  );
});

router.get("/:id", async (req, res) => {
  const vendorBill = await prisma.vendorBill.findUnique({
    where: { id: req.params.id },
    include: { vendor: true, payments: { include: { paymentAccount: true } } },
  });

  if (!vendorBill || !ownsRecord(req, vendorBill.vendorId)) {
    return res.status(404).json({ error: "vendor bill not found" });
  }

  res.json({
    ...vendorBill,
    refNumber: formatRef("BILL", vendorBill.refNumber),
    amount: vendorBill.amount.toNumber(),
    amountDue: vendorBill.amountDue.toNumber(),
    payments: vendorBill.payments.map((payment) => ({
      ...payment,
      refNumber: formatRef("PMT", payment.refNumber),
      amount: payment.amount.toNumber(),
    })),
  });
});

// Create a Vendor Bill directly, with no backing Purchase Order. Staff only — a Contact
// user has no create rights over transactions per the role table.
router.post("/", async (req, res) => {
  if (isContactUser(req)) {
    return res.status(403).json({ error: "insufficient permissions" });
  }

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
    refNumber: formatRef("BILL", vendorBill.refNumber),
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
  if (!vendorBill || !ownsRecord(req, vendorBill.vendorId)) {
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
    payment: { ...payment, refNumber: formatRef("PMT", payment.refNumber), amount: payment.amount.toNumber() },
    vendorBill: {
      ...updatedBill,
      refNumber: formatRef("BILL", updatedBill.refNumber),
      amount: updatedBill.amount.toNumber(),
      amountDue: updatedBill.amountDue.toNumber(),
    },
  });
});

export default router;
