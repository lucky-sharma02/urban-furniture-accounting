import { apiFetch } from "../api";

export interface AnalyticAccount {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  analyticAccountId: string;
  periodStart: string;
  periodEnd: string;
  plannedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetInput {
  periodStart: string;
  periodEnd: string;
  plannedAmount: number;
}

export function listAnalyticAccounts() {
  return apiFetch<AnalyticAccount[]>("/analytic-accounts");
}

export function createAnalyticAccount(name: string) {
  return apiFetch<AnalyticAccount>("/analytic-accounts", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function listBudgets(analyticAccountId: string) {
  return apiFetch<Budget[]>(`/analytic-accounts/${analyticAccountId}/budgets`);
}

export function createBudget(analyticAccountId: string, input: CreateBudgetInput) {
  return apiFetch<Budget>(`/analytic-accounts/${analyticAccountId}/budgets`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
