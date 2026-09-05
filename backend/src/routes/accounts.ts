import { AccountType, Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();
const ACCOUNT_TYPES = Object.values(AccountType);

function isNotFoundError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

router.get("/", async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  const accounts = await prisma.account.findMany({
    where: includeArchived ? undefined : { isArchived: false },
    orderBy: { name: "asc" },
  });
  res.json(accounts);
});

router.post("/", async (req, res) => {
  const { name, type } = req.body;

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required" });
  }
  if (!ACCOUNT_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${ACCOUNT_TYPES.join(", ")}` });
  }

  const account = await prisma.account.create({ data: { name, type } });
  res.status(201).json(account);
});

router.put("/:id", async (req, res) => {
  const { name, type } = req.body;

  if (type !== undefined && !ACCOUNT_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${ACCOUNT_TYPES.join(", ")}` });
  }

  try {
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type } : {}),
      },
    });
    res.json(account);
  } catch (err) {
    if (isNotFoundError(err)) {
      return res.status(404).json({ error: "account not found" });
    }
    throw err;
  }
});

router.patch("/:id/archive", async (req, res) => {
  try {
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: { isArchived: true },
    });
    res.json(account);
  } catch (err) {
    if (isNotFoundError(err)) {
      return res.status(404).json({ error: "account not found" });
    }
    throw err;
  }
});

export default router;
