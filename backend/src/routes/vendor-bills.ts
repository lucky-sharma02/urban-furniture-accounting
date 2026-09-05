import { Router } from "express";
import { getJournalByName, postVendorBill } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";

const router = Router();

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

export default router;
