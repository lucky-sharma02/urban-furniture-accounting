import type { BudgetType } from "@urban-furniture/shared";
import { apiFetch } from "../api";

export interface AnalyticAccount {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetLineInput {
  analyticAccountId: string;
  type: BudgetType;
  committedAmount: number;
}

export interface CreateBudgetInput {
  name: string;
  periodStart: string;
  periodEnd: string;
  responsibleId?: string | null;
  lines: BudgetLineInput[];
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

export function createBudget(input: CreateBudgetInput) {
  return apiFetch<{ id: string }>("/budgets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateBudget(id: string, input: CreateBudgetInput) {
  return apiFetch<{ id: string }>(`/budgets/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function confirmBudget(id: string) {
  return apiFetch<{ id: string; status: string }>(`/budgets/${id}/confirm`, { method: "POST" });
}

export function cancelBudget(id: string) {
  return apiFetch<{ id: string; status: string }>(`/budgets/${id}/cancel`, { method: "POST" });
}

export function reviseBudget(id: string) {
  return apiFetch<{ id: string }>(`/budgets/${id}/revise`, { method: "POST" });
}
