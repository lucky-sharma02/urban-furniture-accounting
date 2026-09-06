import type { BudgetType } from "@prisma/client";
import { prisma } from "./prisma";

// "Achieved" for a budget line = total of the tagged transaction lines inside the
// budget period. Never stored — always recomputed from the source documents:
//   Income   -> Customer Invoice line subtotals (qty x unit price, ex-GST) tagged with the analytic
//   Expenses -> Vendor Bill line subtotals tagged with the analytic
export async function achievedForAnalytic(
  analyticAccountId: string,
  type: BudgetType,
  periodStart: Date,
  periodEnd: Date,
): Promise<number> {
  const period = { gte: periodStart, lte: periodEnd };

  if (type === "Income") {
    const lines = await prisma.customerInvoiceLine.findMany({
      where: { analyticAccountId, customerInvoice: { date: period } },
      select: { quantity: true, unitPrice: true },
    });
    return lines.reduce((sum, l) => sum + l.quantity.toNumber() * l.unitPrice.toNumber(), 0);
  }

  const lines = await prisma.vendorBillLine.findMany({
    where: { analyticAccountId, vendorBill: { date: period } },
    select: { quantity: true, unitPrice: true },
  });
  return lines.reduce((sum, l) => sum + l.quantity.toNumber() * l.unitPrice.toNumber(), 0);
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
  revisedFromName: string | null;
  revisedToId: string | null;
  lines: BudgetLineReport[];
  totals: { committed: number; achieved: number; amountToAchieve: number };
}

// Every non-cancelled budget with its lines. "Achieved" figures are only meaningful
// once a budget is Confirmed (or later Revised) — Draft budgets report 0 achieved.
export async function buildBudgetReport(): Promise<BudgetReport[]> {
  const budgets = await prisma.budget.findMany({
    where: { status: { not: "Cancelled" } },
    include: {
      lines: { include: { analyticAccount: true } },
      responsible: true,
      revisedFrom: { select: { name: true } },
      revisedTo: { select: { id: true } },
    },
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
        revisedFromName: budget.revisedFrom?.name ?? null,
        revisedToId: budget.revisedTo?.id ?? null,
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

export interface IncomingLine {
  analyticAccountId: string | null | undefined;
  amount: number;
}

// Non-blocking check run when a PO / Bill / SO / Invoice is confirmed: for each
// analytic tag on the incoming lines, would booking that much push a Confirmed
// budget line of the given type past its committed amount? Returns one
// human-readable warning per breached budget line (empty when nothing is tagged
// or no matching confirmed budget exists).
export async function budgetWarnings(
  incomingLines: IncomingLine[],
  type: BudgetType,
  date: Date,
): Promise<string[]> {
  const incomingByAnalytic = new Map<string, number>();
  for (const line of incomingLines) {
    if (!line.analyticAccountId) continue;
    incomingByAnalytic.set(
      line.analyticAccountId,
      (incomingByAnalytic.get(line.analyticAccountId) ?? 0) + line.amount,
    );
  }
  if (incomingByAnalytic.size === 0) return [];

  const warnings: string[] = [];
  for (const [analyticAccountId, incoming] of incomingByAnalytic) {
    const budgetLines = await prisma.budgetLine.findMany({
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

    for (const bl of budgetLines) {
      const committed = bl.committedAmount.toNumber();
      const achieved = await achievedForAnalytic(
        bl.analyticAccountId,
        bl.type,
        bl.budget.periodStart,
        bl.budget.periodEnd,
      );
      const projected = achieved + incoming;
      if (projected > committed) {
        warnings.push(
          `Exceeds Approved Budget — "${bl.analyticAccount.name}" on budget "${bl.budget.name}" ` +
            `would reach ${inr(projected)} against a committed ${inr(committed)} ` +
            `(over by ${inr(projected - committed)}).`,
        );
      }
    }
  }
  return warnings;
}
