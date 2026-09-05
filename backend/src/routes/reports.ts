import { Router } from "express";
import PDFDocument from "pdfkit";
import { getAccountBalance, type AccountBalance } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";

const router = Router();

function sumBalances(balances: AccountBalance[]): number {
  return balances.reduce((total, b) => total + b.balance, 0);
}

function parseDate(value: unknown, fallback: Date): Date {
  if (typeof value !== "string") return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

async function buildBalanceSheet(asOf: Date) {
  const accounts = await prisma.account.findMany({ where: { isArchived: false } });
  const balances = await Promise.all(accounts.map((a) => getAccountBalance(a.id, { asOf })));

  const assets = balances.filter((b) => b.accountType === "Asset" || b.accountType === "Bank" || b.accountType === "Cash");
  const liabilities = balances.filter((b) => b.accountType === "Liability");
  const capital = balances.filter((b) => b.accountType === "Capital");
  const income = balances.filter((b) => b.accountType === "Income");
  const expenses = balances.filter((b) => b.accountType === "Expenses" || b.accountType === "OtherExpenses");

  const netIncome = sumBalances(income) - sumBalances(expenses);
  const totalAssets = sumBalances(assets);
  const totalLiabilitiesAndCapital = sumBalances(liabilities) + sumBalances(capital) + netIncome;

  return {
    asOf: asOf.toISOString(),
    assets,
    liabilities,
    capital,
    netIncome,
    totals: { assets: totalAssets, liabilitiesAndCapital: totalLiabilitiesAndCapital },
  };
}

async function buildProfitAndLoss(from: Date, to: Date) {
  const accounts = await prisma.account.findMany({ where: { isArchived: false } });
  const balances = await Promise.all(accounts.map((a) => getAccountBalance(a.id, { from, to })));

  const income = balances.filter((b) => b.accountType === "Income");
  const expenses = balances.filter((b) => b.accountType === "Expenses" || b.accountType === "OtherExpenses");
  const totalIncome = sumBalances(income);
  const totalExpenses = sumBalances(expenses);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    income,
    expenses,
    totals: { income: totalIncome, expenses: totalExpenses, netIncome: totalIncome - totalExpenses },
  };
}

async function buildBudgetReport() {
  const budgets = await prisma.budget.findMany({
    include: { analyticAccount: true },
    orderBy: { periodStart: "desc" },
  });

  return Promise.all(
    budgets.map(async (budget) => {
      const actualAgg = await prisma.journalEntryLine.aggregate({
        where: {
          analyticAccountId: budget.analyticAccountId,
          journalEntry: { date: { gte: budget.periodStart, lte: budget.periodEnd } },
        },
        _sum: { debit: true, credit: true },
      });

      const actualAmount = (actualAgg._sum.debit?.toNumber() ?? 0) - (actualAgg._sum.credit?.toNumber() ?? 0);
      const plannedAmount = budget.plannedAmount.toNumber();

      return {
        id: budget.id,
        analyticAccountId: budget.analyticAccountId,
        analyticAccountName: budget.analyticAccount.name,
        periodStart: budget.periodStart.toISOString(),
        periodEnd: budget.periodEnd.toISOString(),
        plannedAmount,
        actualAmount,
        remainingAmount: plannedAmount - actualAmount,
      };
    }),
  );
}

router.get("/balance-sheet", async (req, res) => {
  const asOf = parseDate(req.query.asOf, new Date());
  res.json(await buildBalanceSheet(asOf));
});

router.get("/profit-and-loss", async (req, res) => {
  const now = new Date();
  const from = parseDate(req.query.from, new Date(now.getFullYear(), 0, 1));
  const to = parseDate(req.query.to, now);
  res.json(await buildProfitAndLoss(from, to));
});

router.get("/budget", async (_req, res) => {
  res.json(await buildBudgetReport());
});

router.get("/balance-sheet/pdf", async (req, res) => {
  const asOf = parseDate(req.query.asOf, new Date());
  const report = await buildBalanceSheet(asOf);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=balance-sheet.pdf");

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text("Balance Sheet", { align: "center" });
  doc.fontSize(10).text(`As of ${new Date(report.asOf).toLocaleDateString()}`, { align: "center" });
  doc.moveDown(1.5);

  doc.fontSize(14).text("Assets");
  report.assets.forEach((a) => doc.fontSize(10).text(`${a.accountName}: ${a.balance.toFixed(2)}`));
  doc.moveDown(0.5).fontSize(11).text(`Total Assets: ${report.totals.assets.toFixed(2)}`);
  doc.moveDown();

  doc.fontSize(14).text("Liabilities");
  report.liabilities.forEach((a) => doc.fontSize(10).text(`${a.accountName}: ${a.balance.toFixed(2)}`));
  doc.moveDown(0.5);

  doc.fontSize(14).text("Capital");
  report.capital.forEach((a) => doc.fontSize(10).text(`${a.accountName}: ${a.balance.toFixed(2)}`));
  doc.moveDown(0.5).fontSize(10).text(`Net Income (to date): ${report.netIncome.toFixed(2)}`);
  doc.moveDown(0.5).fontSize(11).text(`Total Liabilities + Capital: ${report.totals.liabilitiesAndCapital.toFixed(2)}`);

  doc.end();
});

router.get("/profit-and-loss/pdf", async (req, res) => {
  const now = new Date();
  const from = parseDate(req.query.from, new Date(now.getFullYear(), 0, 1));
  const to = parseDate(req.query.to, now);
  const report = await buildProfitAndLoss(from, to);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=profit-and-loss.pdf");

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text("Profit & Loss", { align: "center" });
  doc
    .fontSize(10)
    .text(`${new Date(report.from).toLocaleDateString()} – ${new Date(report.to).toLocaleDateString()}`, {
      align: "center",
    });
  doc.moveDown(1.5);

  doc.fontSize(14).text("Income");
  report.income.forEach((a) => doc.fontSize(10).text(`${a.accountName}: ${a.balance.toFixed(2)}`));
  doc.moveDown(0.5).fontSize(11).text(`Total Income: ${report.totals.income.toFixed(2)}`);
  doc.moveDown();

  doc.fontSize(14).text("Expenses");
  report.expenses.forEach((a) => doc.fontSize(10).text(`${a.accountName}: ${a.balance.toFixed(2)}`));
  doc.moveDown(0.5).fontSize(11).text(`Total Expenses: ${report.totals.expenses.toFixed(2)}`);
  doc.moveDown();

  doc.fontSize(12).text(`Net Income: ${report.totals.netIncome.toFixed(2)}`);

  doc.end();
});

router.get("/budget/pdf", async (_req, res) => {
  const rows = await buildBudgetReport();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=budget-report.pdf");

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text("Budget Report", { align: "center" });
  doc.moveDown(1.5);

  rows.forEach((row) => {
    doc.fontSize(12).text(row.analyticAccountName);
    doc
      .fontSize(10)
      .text(
        `${new Date(row.periodStart).toLocaleDateString()} – ${new Date(row.periodEnd).toLocaleDateString()}`,
      );
    doc.text(`Planned: ${row.plannedAmount.toFixed(2)}`);
    doc.text(`Actual: ${row.actualAmount.toFixed(2)}`);
    doc.text(`Remaining: ${row.remainingAmount.toFixed(2)}`);
    doc.moveDown();
  });

  doc.end();
});

export default router;
