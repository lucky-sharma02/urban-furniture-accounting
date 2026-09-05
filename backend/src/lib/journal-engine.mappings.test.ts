import { afterAll, describe, expect, it } from "vitest";
import { getAccountByName, postCustomerPayment, postVendorBill, postVendorPayment } from "./journal-engine";
import { cleanupJournalEntries, getJournalByName, getOrCreateTestCustomer, getOrCreateTestVendor } from "./test-fixtures";

describe("postVendorBill", () => {
  const sourceIds: string[] = [];
  afterAll(() => cleanupJournalEntries(sourceIds));

  it("debits Purchase Expense and credits Creditors for the same amount", async () => {
    const vendor = await getOrCreateTestVendor();
    const journal = await getJournalByName("Purchase Journal");
    const sourceId = "test-vendor-bill";
    sourceIds.push(sourceId);

    const entry = await postVendorBill({
      journalId: journal.id,
      vendorId: vendor.id,
      amount: 500,
      date: new Date(),
      sourceId,
    });

    const purchaseExpense = await getAccountByName("Purchase Expense");
    const creditors = await getAccountByName("Creditors");

    const debitLine = entry.lines.find((line) => line.accountId === purchaseExpense.id)!;
    const creditLine = entry.lines.find((line) => line.accountId === creditors.id)!;

    expect(debitLine.debit.toNumber()).toBe(500);
    expect(creditLine.credit.toNumber()).toBe(500);
  });
});

describe("postVendorPayment", () => {
  const sourceIds: string[] = [];
  afterAll(() => cleanupJournalEntries(sourceIds));

  it("debits Creditors and credits the payment account", async () => {
    const vendor = await getOrCreateTestVendor();
    const journal = await getJournalByName("Purchase Journal");
    const bank = await getAccountByName("Bank");
    const sourceId = "test-vendor-payment";
    sourceIds.push(sourceId);

    const entry = await postVendorPayment({
      journalId: journal.id,
      vendorId: vendor.id,
      amount: 300,
      date: new Date(),
      sourceId,
      paymentAccountId: bank.id,
    });

    const creditors = await getAccountByName("Creditors");
    const debitLine = entry.lines.find((line) => line.accountId === creditors.id)!;
    const creditLine = entry.lines.find((line) => line.accountId === bank.id)!;

    expect(debitLine.debit.toNumber()).toBe(300);
    expect(creditLine.credit.toNumber()).toBe(300);
  });
});

describe("postCustomerPayment", () => {
  const sourceIds: string[] = [];
  afterAll(() => cleanupJournalEntries(sourceIds));

  it("debits the payment account and credits Debtors", async () => {
    const customer = await getOrCreateTestCustomer();
    const journal = await getJournalByName("Sales Journal");
    const bank = await getAccountByName("Bank");
    const sourceId = "test-customer-payment";
    sourceIds.push(sourceId);

    const entry = await postCustomerPayment({
      journalId: journal.id,
      customerId: customer.id,
      amount: 400,
      date: new Date(),
      sourceId,
      paymentAccountId: bank.id,
    });

    const debtors = await getAccountByName("Debtors");
    const debitLine = entry.lines.find((line) => line.accountId === bank.id)!;
    const creditLine = entry.lines.find((line) => line.accountId === debtors.id)!;

    expect(debitLine.debit.toNumber()).toBe(400);
    expect(creditLine.credit.toNumber()).toBe(400);
  });
});
