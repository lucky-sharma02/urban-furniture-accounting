import { apiFetch, apiFetchBlob } from "../api";

export interface AccountBalanceDTO {
  accountId: string;
  accountName: string;
  accountType: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export interface BalanceSheet {
  asOf: string;
  assets: AccountBalanceDTO[];
  liabilities: AccountBalanceDTO[];
  capital: AccountBalanceDTO[];
  netIncome: number;
  totals: { assets: number; liabilitiesAndCapital: number };
}

export interface ProfitAndLoss {
  from: string;
  to: string;
  income: AccountBalanceDTO[];
  expenses: AccountBalanceDTO[];
  totals: { income: number; expenses: number; netIncome: number };
}

export interface BudgetRow {
  id: string;
  analyticAccountId: string;
  analyticAccountName: string;
  periodStart: string;
  periodEnd: string;
  plannedAmount: number;
  actualAmount: number;
  remainingAmount: number;
}

export function getBalanceSheet(asOf?: string) {
  return apiFetch<BalanceSheet>(`/reports/balance-sheet${asOf ? `?asOf=${asOf}` : ""}`);
}

export function getProfitAndLoss(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return apiFetch<ProfitAndLoss>(`/reports/profit-and-loss${qs ? `?${qs}` : ""}`);
}

export function getBudgetReport() {
  return apiFetch<BudgetRow[]>("/reports/budget");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadBalanceSheetPdf(asOf?: string) {
  const blob = await apiFetchBlob(`/reports/balance-sheet/pdf${asOf ? `?asOf=${asOf}` : ""}`);
  triggerDownload(blob, "balance-sheet.pdf");
}

export async function downloadProfitAndLossPdf(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const blob = await apiFetchBlob(`/reports/profit-and-loss/pdf${qs ? `?${qs}` : ""}`);
  triggerDownload(blob, "profit-and-loss.pdf");
}

export async function downloadBudgetReportPdf() {
  const blob = await apiFetchBlob("/reports/budget/pdf");
  triggerDownload(blob, "budget-report.pdf");
}
