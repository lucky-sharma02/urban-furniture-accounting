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

  const existing = await prisma.analyticAccount.findUnique({ where: { name: name.trim() } });
  if (existing) return res.status(201).json(existing);

  const analyticAccount = await prisma.analyticAccount.create({ data: { name: name.trim() } });
  res.status(201).json(analyticAccount);
});

export default router;
