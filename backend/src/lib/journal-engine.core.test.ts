import { afterAll, describe, expect, it } from "vitest";
import { getAccountByName, postCustomerInvoice, postJournalEntry, UnbalancedJournalEntryError } from "./journal-engine";
import { cleanupJournalEntries, getJournalByName, getOrCreateTestCustomer } from "./test-fixtures";
import { prisma } from "./prisma";

describe("postJournalEntry", () => {
  const sourceIds: string[] = [];

  afterAll(async () => {
    await cleanupJournalEntries(sourceIds);
    await prisma.$disconnect();
  });

  it("rejects an unbalanced entry", async () => {
    const cash = await getAccountByName("Cash");
    const sales = await getAccountByName("Sales Income");
    const journal = await getJournalByName("Cash Journal");
    const sourceId = "test-core-unbalanced";
    sourceIds.push(sourceId);

    await expect(
      postJournalEntry({
        journalId: journal.id,
        date: new Date(),
        sourceType: "Manual",
        sourceId,
        lines: [
          { accountId: cash.id, debit: 100, credit: 0 },
          { accountId: sales.id, debit: 0, credit: 50 },
        ],
      }),
    ).rejects.toBeInstanceOf(UnbalancedJournalEntryError);
  });

  it("posts a balanced entry", async () => {
    const cash = await getAccountByName("Cash");
    const sales = await getAccountByName("Sales Income");
    const journal = await getJournalByName("Cash Journal");
    const sourceId = "test-core-balanced";
    sourceIds.push(sourceId);

    const entry = await postJournalEntry({
      journalId: journal.id,
      date: new Date(),
      sourceType: "Manual",
      sourceId,
      lines: [
        { accountId: cash.id, debit: 100, credit: 0 },
        { accountId: sales.id, debit: 0, credit: 100 },
      ],
    });

    expect(entry.status).toBe("Posted");
    expect(entry.lines).toHaveLength(2);
  });
});

describe("postCustomerInvoice", () => {
  const sourceIds: string[] = [];

  afterAll(async () => {
    await cleanupJournalEntries(sourceIds);
  });

  it("produces a balanced 3-line entry when tax > 0", async () => {
    const customer = await getOrCreateTestCustomer();
    const journal = await getJournalByName("Sales Journal");
    const sourceId = "test-invoice-with-tax";
    sourceIds.push(sourceId);

    const entry = await postCustomerInvoice({
      journalId: journal.id,
      customerId: customer.id,
      baseAmount: 1000,
      taxAmount: 180,
      date: new Date(),
      sourceId,
    });

    expect(entry.lines).toHaveLength(3);
    const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit.toNumber(), 0);
    const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit.toNumber(), 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(1180);
  });

  it("produces a balanced 2-line entry when tax is 0", async () => {
    const customer = await getOrCreateTestCustomer();
    const journal = await getJournalByName("Sales Journal");
    const sourceId = "test-invoice-no-tax";
    sourceIds.push(sourceId);

    const entry = await postCustomerInvoice({
      journalId: journal.id,
      customerId: customer.id,
      baseAmount: 1000,
      taxAmount: 0,
      date: new Date(),
      sourceId,
    });

    expect(entry.lines).toHaveLength(2);
  });
});
