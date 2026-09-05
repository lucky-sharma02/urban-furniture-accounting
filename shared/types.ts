// Single source of truth for types shared between /backend and /frontend.
// Keep in sync with backend/prisma/schema.prisma enums as models are added in M1+.

export type AccountType =
  | "Asset"
  | "Liability"
  | "Bank"
  | "Capital"
  | "Cash"
  | "Income"
  | "Expenses"
  | "OtherExpenses";

export type ContactType = "Vendor" | "Customer" | "Both";

export type JournalType = "Sales" | "Purchase" | "Bank" | "Cash";

export type NormalBalanceSide = "Debit" | "Credit";

// ASSET/EXPENSE/OtherExpenses/Bank/Cash -> Debit; LIABILITY/CAPITAL/INCOME -> Credit
export const ACCOUNT_TYPE_NORMAL_SIDE: Record<AccountType, NormalBalanceSide> = {
  Asset: "Debit",
  Bank: "Debit",
  Cash: "Debit",
  Expenses: "Debit",
  OtherExpenses: "Debit",
  Liability: "Credit",
  Capital: "Credit",
  Income: "Credit",
};

export type JournalEntryStatus = "Draft" | "Posted";

export type JournalEntrySourceType =
  | "VendorBill"
  | "VendorPayment"
  | "CustomerInvoice"
  | "CustomerPayment"
  | "Manual";

export interface JournalEntryLine {
  accountId: string;
  partnerId?: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  journalId: string;
  date: string;
  reference?: string;
  sourceType: JournalEntrySourceType;
  sourceId: string;
  status: JournalEntryStatus;
  lines: JournalEntryLine[];
}

export type UserRole = "Admin" | "Accountant" | "Contact";

// JWT payload shape — contactId is present only for Contact-role tokens
// and is exactly what portal-scope.ts filters every query by.
export interface JwtPayload {
  userId: string;
  role: UserRole;
  contactId?: string;
}

export type DocumentStatus = "Draft" | "Partial" | "Paid";

export type PurchaseOrderStatus = "Draft" | "Billed";
