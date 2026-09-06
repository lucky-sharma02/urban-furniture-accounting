// Opt-in demo data generator for the Budget Report — NOT part of `prisma db seed`.
// Run with `npm run seed:budgets --workspace=backend` AFTER `seed:bulk`.
//
// The base/bulk seeds never tag transactions with an AnalyticAccount, so the Budget
// Report renders empty. This script:
//   1. Ensures a set of "Budget Analytics" cost/revenue centres exists (and adopts
//      any already created through the UI).
//   2. Tags existing Vendor Bills and Customer Invoices against those centres
//      (deterministically, weighted) so "Achieved" is real document data.
//   3. Builds one Confirmed Budget per centre for the current financial year, with
//      an Income line (from tagged invoices) and/or an Expenses line (from tagged
//      bills), committing an amount deliberately above/below achieved so the report
//      shows a mix of on-track and over-budget lines.
//
// Idempotent: clears every existing budget and every analytic tag, then rebuilds.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Canonical centres get the bulk of the volume; anything already in the DB
// (e.g. created via the UI) is folded in with weight 1.
const CANONICAL: { name: string; weight: number }[] = [
  { name: "Living Room Collection", weight: 5 },
  { name: "Office Furniture Line", weight: 4 },
  { name: "Showroom Fitout", weight: 2 },
  { name: "Export Orders", weight: 2 },
  { name: "Freight & Logistics", weight: 2 },
];

// committed = achieved * factor. A spread so the report shows under- and over-budget.
const COMMIT_FACTORS = [1.2, 0.85, 1.4, 0.95, 1.1];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Stable pseudo-random bucket for a string id, so re-runs tag documents identically.
function bucketFor(id: string, buckets: string[]): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return buckets[Math.abs(hash) % buckets.length];
}

async function main() {
  console.log("Seeding Budget Report demo data (analytics, tags, confirmed budgets)...");

  // 1. Ensure canonical centres, then load every analytic account.
  await Promise.all(
    CANONICAL.map((cc) =>
      prisma.analyticAccount.upsert({ where: { name: cc.name }, update: {}, create: { name: cc.name } }),
    ),
  );
  const accounts = await prisma.analyticAccount.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
  });
  const weightByName = new Map(CANONICAL.map((cc) => [cc.name, cc.weight]));
  const weightedNames = accounts.flatMap((a) =>
    Array<string>(weightByName.get(a.name) ?? 1).fill(a.name),
  );
  const idByName = new Map(accounts.map((a) => [a.name, a.id]));

  // 2. Reset budgets + tags (demo data only), then re-tag bills and invoices.
  await prisma.budget.deleteMany({});
  await prisma.vendorBill.updateMany({ data: { analyticAccountId: null } });
  await prisma.customerInvoice.updateMany({ data: { analyticAccountId: null } });

  const bills = await prisma.vendorBill.findMany({ select: { id: true, amount: true } });
  const invoices = await prisma.customerInvoice.findMany({ select: { id: true, baseAmount: true } });

  const expenseByName = new Map<string, number>(accounts.map((a) => [a.name, 0]));
  const incomeByName = new Map<string, number>(accounts.map((a) => [a.name, 0]));

  for (const bill of bills) {
    const name = bucketFor(bill.id, weightedNames);
    await prisma.vendorBill.update({ where: { id: bill.id }, data: { analyticAccountId: idByName.get(name)! } });
    expenseByName.set(name, (expenseByName.get(name) ?? 0) + bill.amount.toNumber());
  }
  for (const invoice of invoices) {
    const name = bucketFor(invoice.id, weightedNames);
    await prisma.customerInvoice.update({
      where: { id: invoice.id },
      data: { analyticAccountId: idByName.get(name)! },
    });
    incomeByName.set(name, (incomeByName.get(name) ?? 0) + invoice.baseAmount.toNumber());
  }

  if (bills.length === 0 && invoices.length === 0) {
    console.log("No vendor bills or customer invoices — run `npm run seed:bulk` first for a meaningful report.");
  }

  // 3. One Confirmed budget per centre for the current financial year.
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), 0, 1);
  const periodEnd = new Date(now.getFullYear(), 11, 31);

  const responsible = await prisma.contact.findFirst({ where: { isArchived: false } });

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const income = round2(incomeByName.get(account.name) ?? 0);
    const expense = round2(expenseByName.get(account.name) ?? 0);
    const factor = COMMIT_FACTORS[i % COMMIT_FACTORS.length];

    const lines: { analyticAccountId: string; type: "Income" | "Expenses"; committedAmount: number }[] = [];
    if (income > 0) {
      lines.push({ analyticAccountId: account.id, type: "Income", committedAmount: round2(income * factor) });
    }
    if (expense > 0) {
      lines.push({ analyticAccountId: account.id, type: "Expenses", committedAmount: round2(expense * factor) });
    }
    if (lines.length === 0) {
      lines.push({ analyticAccountId: account.id, type: "Expenses", committedAmount: 200000 });
    }

    await prisma.budget.create({
      data: {
        name: `${account.name} - FY${now.getFullYear()}`,
        periodStart,
        periodEnd,
        responsibleId: responsible?.id ?? null,
        status: "Confirmed",
        lines: { create: lines },
      },
    });

    console.log(
      `  ${account.name}: income achieved ₹${income.toLocaleString("en-IN")}, ` +
        `expense achieved ₹${expense.toLocaleString("en-IN")}`,
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
