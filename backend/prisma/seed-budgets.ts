// Opt-in demo data generator for the Budget Report — NOT part of `prisma db seed`.
// Run with `npm run seed:budgets --workspace=backend` AFTER `seed:bulk`.
//
// The base and bulk seeds never tag JournalEntryLines with an AnalyticAccount, so
// the Budget Report renders empty. This script:
//   1. Ensures a set of cost-centre AnalyticAccounts exists (and adopts any that
//      were already created through the UI).
//   2. Tags existing "Purchase Expense" debit lines against those cost centres
//      (deterministically, weighted) so "Actual" spend is real ledger data.
//   3. Rebuilds one Budget per cost centre for the current financial year, with a
//      planned amount deliberately above/below actual so the report shows a mix
//      of on-track and over-budget rows.
//
// Idempotent and self-contained: it clears every existing budget and every
// analytic tag, then rebuilds a coherent picture. Safe to re-run.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Canonical cost centres get the bulk of the spend; anything already in the DB
// (e.g. created via the UI) is folded in with weight 1.
const CANONICAL: { name: string; weight: number }[] = [
  { name: "Raw Material Procurement", weight: 6 },
  { name: "Hardware & Fittings", weight: 3 },
  { name: "Finishing & Upholstery", weight: 2 },
  { name: "Freight & Logistics", weight: 2 },
  { name: "Showroom & Facilities", weight: 2 },
];

// Planned = actual * factor. A spread so the report shows under- and over-budget.
const PLANNED_FACTORS = [1.18, 0.9, 1.05, 1.32, 1.5];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Stable pseudo-random bucket for a string id, so re-runs tag lines identically.
function bucketFor(id: string, buckets: string[]): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return buckets[Math.abs(hash) % buckets.length];
}

async function main() {
  console.log("Seeding Budget Report demo data (cost centres, expense tags, budgets)...");

  // 1. Ensure canonical cost centres, then load every analytic account.
  await Promise.all(
    CANONICAL.map((cc) =>
      prisma.analyticAccount.upsert({ where: { name: cc.name }, update: {}, create: { name: cc.name } }),
    ),
  );
  const accounts = await prisma.analyticAccount.findMany({ where: { isArchived: false }, orderBy: { name: "asc" } });
  const weightByName = new Map(CANONICAL.map((cc) => [cc.name, cc.weight]));

  // 2. Reset everything this report depends on (demo data only).
  await prisma.budget.deleteMany({});
  await prisma.journalEntryLine.updateMany({
    where: { analyticAccountId: { not: null } },
    data: { analyticAccountId: null },
  });

  const purchaseExpense = await prisma.account.findUnique({ where: { name: "Purchase Expense" } });
  if (!purchaseExpense) throw new Error('Account "Purchase Expense" not found — run the base seed first.');

  const expenseLines = await prisma.journalEntryLine.findMany({
    where: { accountId: purchaseExpense.id, debit: { gt: 0 } },
    select: { id: true, debit: true },
  });
  if (expenseLines.length === 0) {
    console.log("No posted Purchase Expense lines — run `npm run seed:bulk` first for a meaningful report.");
  }

  // Weighted bucket list across ALL analytic accounts.
  const weightedNames = accounts.flatMap((a) => Array<string>(weightByName.get(a.name) ?? 1).fill(a.name));
  const idByName = new Map(accounts.map((a) => [a.name, a.id]));

  const actualByName = new Map<string, number>(accounts.map((a) => [a.name, 0]));
  for (const line of expenseLines) {
    const name = bucketFor(line.id, weightedNames);
    await prisma.journalEntryLine.update({ where: { id: line.id }, data: { analyticAccountId: idByName.get(name)! } });
    actualByName.set(name, (actualByName.get(name) ?? 0) + line.debit.toNumber());
  }

  // 3. One budget per cost centre for the current financial year.
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), 0, 1);
  const periodEnd = new Date(now.getFullYear(), 11, 31);

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const actual = actualByName.get(account.name) ?? 0;
    const factor = PLANNED_FACTORS[i % PLANNED_FACTORS.length];
    const planned = actual > 0 ? round2(actual * factor) : 200000;
    await prisma.budget.create({
      data: { analyticAccountId: account.id, periodStart, periodEnd, plannedAmount: planned },
    });
    console.log(
      `  ${account.name}: planned ₹${planned.toLocaleString("en-IN")} vs actual ₹${round2(actual).toLocaleString("en-IN")}`,
    );
  }

  console.log("Budget Report demo seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
