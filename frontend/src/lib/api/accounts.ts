import type { AccountType } from "@urban-furniture/shared";
import { apiFetch } from "../api";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountInput {
  name: string;
  type: AccountType;
}

export function listAccounts(includeArchived = false) {
  return apiFetch<Account[]>(`/accounts${includeArchived ? "?includeArchived=true" : ""}`);
}

export interface PaymentAccount {
  id: string;
  name: string;
  type: AccountType;
}

/**
 * Bank/Cash accounts for the Record Payment dialog. Unlike listAccounts(), this is
 * available to every authenticated role, including Contact (portal) users.
 */
export function listPaymentAccounts() {
  return apiFetch<PaymentAccount[]>("/payment-accounts");
}

export function createAccount(input: AccountInput) {
  return apiFetch<Account>("/accounts", { method: "POST", body: JSON.stringify(input) });
}

export function updateAccount(id: string, input: Partial<AccountInput>) {
  return apiFetch<Account>(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function archiveAccount(id: string) {
  return apiFetch<Account>(`/accounts/${id}/archive`, { method: "PATCH" });
}
