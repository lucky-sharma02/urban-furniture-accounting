import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const analyticAccounts = await prisma.analyticAccount.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
  });
  res.json(analyticAccounts);
});

router.post("/", async (req, res) => {
  const { name } = req.body;
  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required" });
  }

  const analyticAccount = await prisma.analyticAccount.create({ data: { name } });
  res.status(201).json(analyticAccount);
});

router.get("/:id/budgets", async (req, res) => {
  const budgets = await prisma.budget.findMany({
    where: { analyticAccountId: req.params.id },
    orderBy: { periodStart: "desc" },
  });
  res.json(budgets.map((b) => ({ ...b, plannedAmount: b.plannedAmount.toNumber() })));
});

router.post("/:id/budgets", async (req, res) => {
  const { periodStart, periodEnd, plannedAmount } = req.body;

  if (typeof periodStart !== "string" || Number.isNaN(Date.parse(periodStart))) {
    return res.status(400).json({ error: "a valid periodStart is required" });
  }
  if (typeof periodEnd !== "string" || Number.isNaN(Date.parse(periodEnd))) {
    return res.status(400).json({ error: "a valid periodEnd is required" });
  }
  if (typeof plannedAmount !== "number" || plannedAmount < 0) {
    return res.status(400).json({ error: "plannedAmount must be a non-negative number" });
  }

  const budget = await prisma.budget.create({
    data: {
      analyticAccountId: req.params.id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      plannedAmount,
    },
  });

  res.status(201).json({ ...budget, plannedAmount: budget.plannedAmount.toNumber() });
});

export default router;
