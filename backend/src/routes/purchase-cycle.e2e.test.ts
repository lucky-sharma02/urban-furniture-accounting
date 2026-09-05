import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";
import { getAccountBalance, getAccountByName } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";
import { getOrCreateTestVendor } from "../lib/test-fixtures";

async function cleanupBill(billId: string, poId?: string) {
  const payments = await prisma.payment.findMany({ where: { vendorBillId: billId } });
  const sourceIds = [billId, ...payments.map((p) => p.id)];
  await prisma.journalEntryLine.deleteMany({ where: { journalEntry: { sourceId: { in: sourceIds } } } });
  await prisma.journalEntry.deleteMany({ where: { sourceId: { in: sourceIds } } });
  await prisma.payment.deleteMany({ where: { vendorBillId: billId } });
  await prisma.vendorBill.deleteMany({ where: { id: billId } });
  if (poId) {
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: poId } });
    await prisma.purchaseOrder.deleteMany({ where: { id: poId } });
  }
}

describe("Purchase cycle E2E", () => {
  it("PO -> Bill -> full payment returns Creditors to its prior balance", async () => {
    const vendor = await getOrCreateTestVendor();
    const product = await prisma.product.findFirstOrThrow();
    const bank = await getAccountByName("Bank");
    const creditors = await getAccountByName("Creditors");

    const before = await getAccountBalance(creditors.id);

    const poRes = await request(app)
      .post("/purchase-orders")
      .send({
        vendorId: vendor.id,
        date: "2026-01-01",
        lines: [{ productId: product.id, quantity: 2, unitPrice: 100 }],
      });
    expect(poRes.status).toBe(201);
    const poId = poRes.body.id;

    const billRes = await request(app).post(`/purchase-orders/${poId}/convert-to-bill`);
    expect(billRes.status).toBe(201);
    const billId = billRes.body.id;
    const amount = billRes.body.amount;
    expect(amount).toBe(200);

    const afterBill = await getAccountBalance(creditors.id);
    expect(afterBill.balance).toBeCloseTo(before.balance + amount, 2);

    const payRes = await request(app)
      .post(`/vendor-bills/${billId}/payments`)
      .send({ amount, date: "2026-01-02", paymentAccountId: bank.id });
    expect(payRes.status).toBe(201);
    expect(payRes.body.vendorBill.status).toBe("Paid");
    expect(payRes.body.vendorBill.amountDue).toBe(0);

    const after = await getAccountBalance(creditors.id);
    expect(after.balance).toBeCloseTo(before.balance, 2);

    await cleanupBill(billId, poId);
  });

  it("Bill -> two partial payments transitions Draft -> Partial -> Paid", async () => {
    const vendor = await getOrCreateTestVendor();
    const bank = await getAccountByName("Bank");

    const billRes = await request(app)
      .post("/vendor-bills")
      .send({ vendorId: vendor.id, date: "2026-01-01", amount: 1000 });
    expect(billRes.status).toBe(201);
    expect(billRes.body.status).toBe("Draft");
    expect(billRes.body.amountDue).toBe(1000);
    const billId = billRes.body.id;

    const pay1 = await request(app)
      .post(`/vendor-bills/${billId}/payments`)
      .send({ amount: 400, date: "2026-01-02", paymentAccountId: bank.id });
    expect(pay1.status).toBe(201);
    expect(pay1.body.vendorBill.status).toBe("Partial");
    expect(pay1.body.vendorBill.amountDue).toBe(600);

    const pay2 = await request(app)
      .post(`/vendor-bills/${billId}/payments`)
      .send({ amount: 600, date: "2026-01-03", paymentAccountId: bank.id });
    expect(pay2.status).toBe(201);
    expect(pay2.body.vendorBill.status).toBe("Paid");
    expect(pay2.body.vendorBill.amountDue).toBe(0);

    await cleanupBill(billId);
  });
});
