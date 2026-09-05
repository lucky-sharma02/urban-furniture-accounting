import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";
import { getAccountBalance, getAccountByName } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";
import { getOrCreateTestCustomer } from "../lib/test-fixtures";

async function cleanupInvoice(invoiceId: string, soId?: string) {
  const payments = await prisma.payment.findMany({ where: { customerInvoiceId: invoiceId } });
  const sourceIds = [invoiceId, ...payments.map((p) => p.id)];
  await prisma.journalEntryLine.deleteMany({ where: { journalEntry: { sourceId: { in: sourceIds } } } });
  await prisma.journalEntry.deleteMany({ where: { sourceId: { in: sourceIds } } });
  await prisma.payment.deleteMany({ where: { customerInvoiceId: invoiceId } });
  await prisma.customerInvoice.deleteMany({ where: { id: invoiceId } });
  if (soId) {
    await prisma.salesOrderLine.deleteMany({ where: { salesOrderId: soId } });
    await prisma.salesOrder.deleteMany({ where: { id: soId } });
  }
}

describe("Sales cycle E2E", () => {
  it("SO -> Invoice -> full payment returns Debtors to its prior balance", async () => {
    const customer = await getOrCreateTestCustomer();
    const product = await prisma.product.findFirstOrThrow();
    const bank = await getAccountByName("Bank");
    const debtors = await getAccountByName("Debtors");

    const before = await getAccountBalance(debtors.id);

    const soRes = await request(app)
      .post("/sales-orders")
      .send({
        customerId: customer.id,
        date: "2026-01-01",
        lines: [{ productId: product.id, quantity: 2, unitPrice: 100 }],
      });
    expect(soRes.status).toBe(201);
    const soId = soRes.body.id;

    const invoiceRes = await request(app).post(`/sales-orders/${soId}/generate-invoice`);
    expect(invoiceRes.status).toBe(201);
    const invoiceId = invoiceRes.body.id;
    expect(invoiceRes.body.baseAmount).toBe(200);
    expect(invoiceRes.body.taxAmount).toBe(36);
    const amount = invoiceRes.body.amount;
    expect(amount).toBe(236);

    const afterInvoice = await getAccountBalance(debtors.id);
    expect(afterInvoice.balance).toBeCloseTo(before.balance + amount, 2);

    const payRes = await request(app)
      .post(`/customer-invoices/${invoiceId}/payments`)
      .send({ amount, date: "2026-01-02", paymentAccountId: bank.id });
    expect(payRes.status).toBe(201);
    expect(payRes.body.customerInvoice.status).toBe("Paid");
    expect(payRes.body.customerInvoice.amountDue).toBe(0);

    const after = await getAccountBalance(debtors.id);
    expect(after.balance).toBeCloseTo(before.balance, 2);

    await cleanupInvoice(invoiceId, soId);
  });

  it("Invoice -> two partial payments transitions Draft -> Partial -> Paid", async () => {
    const customer = await getOrCreateTestCustomer();
    const product = await prisma.product.findFirstOrThrow();
    const bank = await getAccountByName("Bank");

    const soRes = await request(app)
      .post("/sales-orders")
      .send({
        customerId: customer.id,
        date: "2026-01-01",
        lines: [{ productId: product.id, quantity: 1, unitPrice: 1000 }],
      });
    expect(soRes.status).toBe(201);
    const soId = soRes.body.id;

    const invoiceRes = await request(app).post(`/sales-orders/${soId}/generate-invoice`);
    expect(invoiceRes.status).toBe(201);
    expect(invoiceRes.body.status).toBe("Draft");
    const invoiceId = invoiceRes.body.id;
    const amount = invoiceRes.body.amount;
    expect(amount).toBe(1180);
    expect(invoiceRes.body.amountDue).toBe(1180);

    const pay1 = await request(app)
      .post(`/customer-invoices/${invoiceId}/payments`)
      .send({ amount: 700, date: "2026-01-02", paymentAccountId: bank.id });
    expect(pay1.status).toBe(201);
    expect(pay1.body.customerInvoice.status).toBe("Partial");
    expect(pay1.body.customerInvoice.amountDue).toBe(480);

    const pay2 = await request(app)
      .post(`/customer-invoices/${invoiceId}/payments`)
      .send({ amount: 480, date: "2026-01-03", paymentAccountId: bank.id });
    expect(pay2.status).toBe(201);
    expect(pay2.body.customerInvoice.status).toBe("Paid");
    expect(pay2.body.customerInvoice.amountDue).toBe(0);

    await cleanupInvoice(invoiceId, soId);
  });
});
