import type { AccountType, JournalEntrySourceType } from "@prisma/client";
import { ACCOUNT_TYPE_NORMAL_SIDE } from "@urban-furniture/shared";
import { prisma } from "./prisma";

export interface JournalEntryLineInput {
  accountId: string;
  partnerId?: string;
  debit: number;
  credit: number;
}

export interface PostJournalEntryInput {
  journalId: string;
  date: Date;
  reference?: string;
  sourceType: JournalEntrySourceType;
  sourceId: string;
  lines: JournalEntryLineInput[];
}

export class UnbalancedJournalEntryError extends Error {
  constructor(totalDebit: number, totalCredit: number) {
    super(`journal entry is unbalanced: debit ${totalDebit} !== credit ${totalCredit}`);
    this.name = "UnbalancedJournalEntryError";
  }
}

// Rounds to cents before comparing so floating point noise (e.g. 0.1 + 0.2) never
// causes a false "unbalanced" rejection or a false pass.
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// The only function allowed to write a JournalEntryLine — every post*() mapping
// function in this module must route through here so the balance check is never bypassed.
export async function postJournalEntry(input: PostJournalEntryInput) {
  if (input.lines.length < 2) {
    throw new Error("a journal entry must have at least two lines");
  }

  for (const line of input.lines) {
    if (line.debit < 0 || line.credit < 0) {
      throw new Error("debit and credit amounts must be non-negative");
    }
    if (line.debit > 0 && line.credit > 0) {
      throw new Error("a journal entry line cannot have both a debit and a credit amount");
    }
    if (line.debit === 0 && line.credit === 0) {
      throw new Error("a journal entry line must have either a debit or a credit amount");
    }
  }

  const totalDebit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = input.lines.reduce((sum, line) => sum + line.credit, 0);

  if (toCents(totalDebit) !== toCents(totalCredit)) {
    throw new UnbalancedJournalEntryError(totalDebit, totalCredit);
  }

  return prisma.$transaction(async (tx) => {
    return tx.journalEntry.create({
      data: {
        journalId: input.journalId,
        date: input.date,
        reference: input.reference,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        status: "Posted",
        lines: {
          create: input.lines.map((line) => ({
            accountId: line.accountId,
            partnerId: line.partnerId,
            debit: line.debit,
            credit: line.credit,
          })),
        },
      },
      include: { lines: true },
    });
  });
}

// Fixed accounts (Purchase Expense, Creditors, Debtors, Sales Income, Tax Payable, ...)
// are looked up by name rather than passed as ids, since the debit/credit mapping
// itself is hardcoded business logic, not something callers should be able to vary.
export async function getAccountByName(name: string) {
  const account = await prisma.account.findUnique({ where: { name } });
  if (!account) {
    throw new Error(`required account "${name}" not found — has the seed script run?`);
  }
  return account;
}

export interface PostVendorBillInput {
  journalId: string;
  vendorId: string;
  amount: number;
  date: Date;
  reference?: string;
  sourceId: string;
}

// Vendor Bill confirmed: Debit Purchase Expense, Credit Creditors.
export async function postVendorBill(input: PostVendorBillInput) {
  const [purchaseExpense, creditors] = await Promise.all([
    getAccountByName("Purchase Expense"),
    getAccountByName("Creditors"),
  ]);

  return postJournalEntry({
    journalId: input.journalId,
    date: input.date,
    reference: input.reference,
    sourceType: "VendorBill",
    sourceId: input.sourceId,
    lines: [
      { accountId: purchaseExpense.id, partnerId: input.vendorId, debit: input.amount, credit: 0 },
      { accountId: creditors.id, partnerId: input.vendorId, debit: 0, credit: input.amount },
    ],
  });
}

export interface PostVendorPaymentInput {
  journalId: string;
  vendorId: string;
  amount: number;
  date: Date;
  reference?: string;
  sourceId: string;
  // Bank or Cash account id — which one was actually used is a runtime choice,
  // not fixed business logic, so the caller resolves it (unlike Creditors below).
  paymentAccountId: string;
}

// Payment to Vendor: Debit Creditors, Credit Bank/Cash.
export async function postVendorPayment(input: PostVendorPaymentInput) {
  const creditors = await getAccountByName("Creditors");

  return postJournalEntry({
    journalId: input.journalId,
    date: input.date,
    reference: input.reference,
    sourceType: "VendorPayment",
    sourceId: input.sourceId,
    lines: [
      { accountId: creditors.id, partnerId: input.vendorId, debit: input.amount, credit: 0 },
      { accountId: input.paymentAccountId, partnerId: input.vendorId, debit: 0, credit: input.amount },
    ],
  });
}

export interface PostCustomerInvoiceInput {
  journalId: string;
  customerId: string;
  baseAmount: number;
  // Tax is in scope for this build. A 0 taxAmount (e.g. a tax-exempt line) still
  // produces a valid 2-line entry — the Tax Payable line is only added when > 0.
  taxAmount: number;
  date: Date;
  reference?: string;
  sourceId: string;
}

// Customer Invoice generated: Debit Debtors (full amount), Credit Sales Income (base)
// + Credit Tax Payable (tax) when tax > 0 — a 3-line entry.
export async function postCustomerInvoice(input: PostCustomerInvoiceInput) {
  const [debtors, salesIncome] = await Promise.all([
    getAccountByName("Debtors"),
    getAccountByName("Sales Income"),
  ]);

  const totalAmount = input.baseAmount + input.taxAmount;

  const lines: JournalEntryLineInput[] = [
    { accountId: debtors.id, partnerId: input.customerId, debit: totalAmount, credit: 0 },
    { accountId: salesIncome.id, partnerId: input.customerId, debit: 0, credit: input.baseAmount },
  ];

  if (input.taxAmount > 0) {
    const taxPayable = await getAccountByName("Tax Payable");
    lines.push({ accountId: taxPayable.id, partnerId: input.customerId, debit: 0, credit: input.taxAmount });
  }

  return postJournalEntry({
    journalId: input.journalId,
    date: input.date,
    reference: input.reference,
    sourceType: "CustomerInvoice",
    sourceId: input.sourceId,
    lines,
  });
}

export interface PostCustomerPaymentInput {
  journalId: string;
  customerId: string;
  amount: number;
  date: Date;
  reference?: string;
  sourceId: string;
  paymentAccountId: string;
}

// Payment from Customer: Debit Bank/Cash, Credit Debtors.
export async function postCustomerPayment(input: PostCustomerPaymentInput) {
  const debtors = await getAccountByName("Debtors");

  return postJournalEntry({
    journalId: input.journalId,
    date: input.date,
    reference: input.reference,
    sourceType: "CustomerPayment",
    sourceId: input.sourceId,
    lines: [
      { accountId: input.paymentAccountId, partnerId: input.customerId, debit: input.amount, credit: 0 },
      { accountId: debtors.id, partnerId: input.customerId, debit: 0, credit: input.amount },
    ],
  });
}

export interface AccountBalance {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  debitTotal: number;
  creditTotal: number;
  // Signed so the account's own normal side is always positive — e.g. an Asset
  // account with more debits than credits reports a positive balance.
  balance: number;
}

// Running balance for one account, computed from posted JournalEntryLines.
// Used by reports (M5) instead of re-deriving it from raw transactions each time.
export async function getAccountBalance(accountId: string): Promise<AccountBalance> {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });

  const totals = await prisma.journalEntryLine.aggregate({
    where: { accountId },
    _sum: { debit: true, credit: true },
  });

  const debitTotal = totals._sum.debit?.toNumber() ?? 0;
  const creditTotal = totals._sum.credit?.toNumber() ?? 0;
  const normalSide = ACCOUNT_TYPE_NORMAL_SIDE[account.type];
  const balance = normalSide === "Debit" ? debitTotal - creditTotal : creditTotal - debitTotal;

  return {
    accountId: account.id,
    accountName: account.name,
    accountType: account.type,
    debitTotal,
    creditTotal,
    balance,
  };
}
