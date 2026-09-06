import type { BudgetType } from "@prisma/client";
import { prisma } from "./prisma";

// "Achieved" for a budget line = total of the tagged realized documents inside the
// budget period. Never stored — always recomputed from the source documents:
//   Income   -> Customer Invoice base amounts (ex-GST revenue) tagged with the analytic
//   Expenses -> Vendor Bill amounts tagged with the analytic
export async function achievedForAnalytic(
  analyticAccountId: string,
  type: BudgetType,
  periodStart: Date,
  periodEnd: Date,
): Promise<number> {
  if (type === "Income") {
    const agg = await prisma.customerInvoice.aggregate({
      _sum: { baseAmount: true },
      where: { analyticAccountId, date: { gte: periodStart, lte: periodEnd } },
    });
    return agg._sum.baseAmount?.toNumber() ?? 0;
  }

  const agg = await prisma.vendorBill.aggregate({
    _sum: { amount: true },
    where: { analyticAccountId, date: { gte: periodStart, lte: periodEnd } },
  });
  return agg._sum.amount?.toNumber() ?? 0;
}

export interface BudgetLineReport {
  id: string;
  analyticAccountId: string;
  analyticAccountName: string;
  type: BudgetType;
  committedAmount: number;
  achievedAmount: number;
  achievedPct: number;
  amountToAchieve: number;
}

export interface BudgetReport {
  id: string;
  name: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  responsibleId: string | null;
  responsibleName: string | null;
  revisedFromId: string | null;
  lines: BudgetLineReport[];
  totals: { committed: number; achieved: number; amountToAchieve: number };
}

// Every non-cancelled budget with its lines. "Achieved" figures are only meaningful
// once a budget is Confirmed (or later Revised) — Draft budgets report 0 achieved.
export async function buildBudgetReport(): Promise<BudgetReport[]> {
  const budgets = await prisma.budget.findMany({
    where: { status: { not: "Cancelled" } },
    include: { lines: { include: { analyticAccount: true } }, responsible: true },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    budgets.map(async (budget) => {
      const tracked = budget.status === "Confirmed" || budget.status === "Revised";
      const lines = await Promise.all(
        budget.lines.map(async (line) => {
          const committedAmount = line.committedAmount.toNumber();
          const achievedAmount = tracked
            ? await achievedForAnalytic(
                line.analyticAccountId,
                line.type,
                budget.periodStart,
                budget.periodEnd,
              )
            : 0;
          return {
            id: line.id,
            analyticAccountId: line.analyticAccountId,
            analyticAccountName: line.analyticAccount.name,
            type: line.type,
            committedAmount,
            achievedAmount,
            achievedPct: committedAmount > 0 ? (achievedAmount / committedAmount) * 100 : 0,
            amountToAchieve: committedAmount - achievedAmount,
          };
        }),
      );

      return {
        id: budget.id,
        name: budget.name,
        status: budget.status,
        periodStart: budget.periodStart.toISOString(),
        periodEnd: budget.periodEnd.toISOString(),
        responsibleId: budget.responsibleId,
        responsibleName: budget.responsible?.name ?? null,
        revisedFromId: budget.revisedFromId,
        lines,
        totals: {
          committed: lines.reduce((s, l) => s + l.committedAmount, 0),
          achieved: lines.reduce((s, l) => s + l.achievedAmount, 0),
          amountToAchieve: lines.reduce((s, l) => s + l.amountToAchieve, 0),
        },
      };
    }),
  );
}

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Non-blocking check run when a PO / Bill / SO / Invoice is confirmed: would booking
// `incomingAmount` against this analytic push any Confirmed budget line past its
// committed amount? Returns one human-readable warning per breached line (empty if
// the transaction has no analytic tag or no matching confirmed budget).
export async function budgetWarnings(
  analyticAccountId: string | null | undefined,
  type: BudgetType,
  incomingAmount: number,
  date: Date,
): Promise<string[]> {
  if (!analyticAccountId) return [];

  const lines = await prisma.budgetLine.findMany({
    where: {
      analyticAccountId,
      type,
      budget: {
        status: "Confirmed",
        periodStart: { lte: date },
        periodEnd: { gte: date },
      },
    },
    include: { budget: true, analyticAccount: true },
  });

  const warnings: string[] = [];
  for (const line of lines) {
    const committed = line.committedAmount.toNumber();
    const achieved = await achievedForAnalytic(
      line.analyticAccountId,
      line.type,
      line.budget.periodStart,
      line.budget.periodEnd,
    );
    const projected = achieved + incomingAmount;
    if (projected > committed) {
      warnings.push(
        `Exceeds Approved Budget — "${line.analyticAccount.name}" on budget "${line.budget.name}" ` +
          `would reach ${inr(projected)} against a committed ${inr(committed)} ` +
          `(over by ${inr(projected - committed)}).`,
      );
    }
  }
  return warnings;
}
