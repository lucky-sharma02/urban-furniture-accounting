import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";
import { hashPassword } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { contactAuthHeader, testAuthHeader } from "../lib/test-fixtures";

async function getOrCreateContact(email: string, name: string) {
  return prisma.contact.upsert({
    where: { email },
    update: {},
    create: { name, type: "Customer", email },
  });
}

async function cleanupInvoice(invoiceId: string) {
  await prisma.journalEntryLine.deleteMany({ where: { journalEntry: { sourceId: invoiceId } } });
  await prisma.journalEntry.deleteMany({ where: { sourceId: invoiceId } });
  await prisma.customerInvoice.deleteMany({ where: { id: invoiceId } });
}

describe("RBAC", () => {
  it("rejects requests with no token", async () => {
    const res = await request(app).get("/accounts");
    expect(res.status).toBe(401);
  });

  it("rejects requests with an invalid token", async () => {
    const res = await request(app).get("/accounts").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("allows Admin to reach staff-only routes", async () => {
    const res = await request(app).get("/accounts").set("Authorization", testAuthHeader());
    expect(res.status).toBe(200);
  });

  it("blocks a Contact-role token from staff-only routes", async () => {
    const customer = await getOrCreateContact("rbac-test-customer@example.com", "RBAC Test Customer");
    const res = await request(app)
      .get("/accounts")
      .set("Authorization", contactAuthHeader(customer.id));
    expect(res.status).toBe(403);
  });

  it("login rejects a wrong password and succeeds with the right one", async () => {
    const email = "rbac-login-test@example.com";
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: await hashPassword("correct-horse"), role: "Admin" },
    });

    const wrong = await request(app).post("/auth/login").send({ email, password: "wrong" });
    expect(wrong.status).toBe(401);

    const right = await request(app).post("/auth/login").send({ email, password: "correct-horse" });
    expect(right.status).toBe(200);
    expect(right.body.token).toBeTruthy();
    expect(right.body.role).toBe("Admin");
  });

  it("a Contact user cannot see or reach another Contact's invoice", async () => {
    const customerA = await getOrCreateContact("rbac-customer-a@example.com", "RBAC Customer A");
    const customerB = await getOrCreateContact("rbac-customer-b@example.com", "RBAC Customer B");

    const invoiceA = await prisma.customerInvoice.create({
      data: {
        customerId: customerA.id,
        date: new Date("2026-01-01"),
        baseAmount: 100,
        taxAmount: 18,
        amount: 118,
        amountDue: 118,
        status: "Draft",
      },
    });

    try {
      const listAsB = await request(app)
        .get("/customer-invoices")
        .set("Authorization", contactAuthHeader(customerB.id));
      expect(listAsB.status).toBe(200);
      expect(listAsB.body.find((inv: { id: string }) => inv.id === invoiceA.id)).toBeUndefined();

      const detailAsB = await request(app)
        .get(`/customer-invoices/${invoiceA.id}`)
        .set("Authorization", contactAuthHeader(customerB.id));
      expect(detailAsB.status).toBe(404);

      const detailAsA = await request(app)
        .get(`/customer-invoices/${invoiceA.id}`)
        .set("Authorization", contactAuthHeader(customerA.id));
      expect(detailAsA.status).toBe(200);
    } finally {
      await cleanupInvoice(invoiceA.id);
    }
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "rbac-login-test@example.com" } });
});
