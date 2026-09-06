import { Router } from "express";
import { formatRef } from "../lib/format-ref";
import { getJournalByName, postCustomerPayment } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";
import { ownsRecord, scopeWhere } from "../middleware/portal-scope";

const router = Router();

// Rounds to cents before comparing so floating point noise never leaves an invoice
// a fraction of a paisa short of "Paid" after repeated partial payments.
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeLine(line: any) {
  return { ...line, quantity: line.quantity.toNumber(), unitPrice: line.unitPrice.toNumber() };
}

router.get("/", async (req, res) => {
  const invoices = await prisma.customerInvoice.findMany({
    where: scopeWhere(req, "customerId"),
    include: { customer: true, lines: { include: { analyticAccount: true } } },
    orderBy: { date: "desc" },
  });

  res.json(
    invoices.map((invoice) => ({
      ...invoice,
      refNumber: formatRef("INV", invoice.refNumber, invoice.date),
      baseAmount: invoice.baseAmount.toNumber(),
      taxAmount: invoice.taxAmount.toNumber(),
      amount: invoice.amount.toNumber(),
      amountDue: invoice.amountDue.toNumber(),
      lines: invoice.lines.map(serializeLine),
    })),
  );
});

router.get("/:id", async (req, res) => {
  const invoice = await prisma.customerInvoice.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      salesOrder: { select: { id: true, refNumber: true } },
      lines: { include: { product: true, analyticAccount: true } },
      payments: { include: { paymentAccount: true } },
    },
  });

  if (!invoice || !ownsRecord(req, invoice.customerId)) {
    return res.status(404).json({ error: "customer invoice not found" });
  }

  res.json({
    ...invoice,
    refNumber: formatRef("INV", invoice.refNumber, invoice.date),
    baseAmount: invoice.baseAmount.toNumber(),
    taxAmount: invoice.taxAmount.toNumber(),
    amount: invoice.amount.toNumber(),
    amountDue: invoice.amountDue.toNumber(),
    salesOrder: invoice.salesOrder
      ? { id: invoice.salesOrder.id, refNumber: formatRef("SO", invoice.salesOrder.refNumber) }
      : null,
    lines: invoice.lines.map(serializeLine),
    payments: invoice.payments.map((payment) => ({
      ...payment,
      refNumber: formatRef("PMT", payment.refNumber),
      amount: payment.amount.toNumber(),
    })),
  });
});

// Records a (possibly partial) payment against an invoice, recalculates amountDue,
// transitions status Draft -> Partial -> Paid, and posts the payment (Debit Bank or
// Cash / Credit Debtors) via postCustomerPayment().
router.post("/:id/payments", async (req, res) => {
  const { amount, date, paymentAccountId, note } = req.body;

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "a valid date is required" });
  }
  if (typeof paymentAccountId !== "string" || paymentAccountId.length === 0) {
    return res.status(400).json({ error: "paymentAccountId is required" });
  }

  const invoice = await prisma.customerInvoice.findUnique({ where: { id: req.params.id } });
  if (!invoice || !ownsRecord(req, invoice.customerId)) {
    return res.status(404).json({ error: "customer invoice not found" });
  }

  const amountDue = invoice.amountDue.toNumber();
  if (toCents(amount) > toCents(amountDue)) {
    return res.status(400).json({ error: `payment of ${amount} exceeds amount due of ${amountDue}` });
  }

  const paymentDate = new Date(date);

  const payment = await prisma.payment.create({
    data: {
      customerInvoiceId: invoice.id,
      amount,
      date: paymentDate,
      note: typeof note === "string" && note.trim() !== "" ? note.trim() : null,
      paymentAccountId,
    },
  });

  const newAmountDue = Math.max(0, toCents(amountDue) - toCents(amount)) / 100;
  const newStatus = newAmountDue === 0 ? "Paid" : "Partial";

  const updatedInvoice = await prisma.customerInvoice.update({
    where: { id: invoice.id },
    data: { amountDue: newAmountDue, status: newStatus },
  });

  const salesJournal = await getJournalByName("Sales Journal");

  await postCustomerPayment({
    journalId: salesJournal.id,
    customerId: invoice.customerId,
    amount,
    date: paymentDate,
    reference: `Payment for invoice ${invoice.id}`,
    sourceId: payment.id,
    paymentAccountId,
  });

  res.status(201).json({
    payment: { ...payment, refNumber: formatRef("PMT", payment.refNumber), amount: payment.amount.toNumber() },
    customerInvoice: {
      ...updatedInvoice,
      refNumber: formatRef("INV", updatedInvoice.refNumber, updatedInvoice.date),
      baseAmount: updatedInvoice.baseAmount.toNumber(),
      taxAmount: updatedInvoice.taxAmount.toNumber(),
      amount: updatedInvoice.amount.toNumber(),
      amountDue: updatedInvoice.amountDue.toNumber(),
    },
  });
});

export default router;
