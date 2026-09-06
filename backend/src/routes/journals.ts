import { JournalType, Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();
const JOURNAL_TYPES = Object.values(JournalType);

function isNotFoundError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

function normalizeDefaultAccountId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" && value.length > 0 ? value : null;
}

router.get("/", async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  const journals = await prisma.journal.findMany({
    where: includeArchived ? undefined : { isArchived: false },
    include: { defaultAccount: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  res.json(journals);
});

router.post("/", async (req, res) => {
  const { name, type } = req.body;
  const defaultAccountId = normalizeDefaultAccountId(req.body.defaultAccountId);

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required" });
  }
  if (!JOURNAL_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${JOURNAL_TYPES.join(", ")}` });
  }

  const journal = await prisma.journal.create({
    data: { name, type, defaultAccountId: defaultAccountId ?? null },
    include: { defaultAccount: { select: { id: true, name: true } } },
  });
  res.status(201).json(journal);
});

router.put("/:id", async (req, res) => {
  const { name, type } = req.body;
  const defaultAccountId = normalizeDefaultAccountId(req.body.defaultAccountId);

  if (type !== undefined && !JOURNAL_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${JOURNAL_TYPES.join(", ")}` });
  }

  try {
    const journal = await prisma.journal.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(defaultAccountId !== undefined ? { defaultAccountId } : {}),
      },
      include: { defaultAccount: { select: { id: true, name: true } } },
    });
    res.json(journal);
  } catch (err) {
    if (isNotFoundError(err)) {
      return res.status(404).json({ error: "journal not found" });
    }
    throw err;
  }
});

router.patch("/:id/archive", async (req, res) => {
  try {
    const journal = await prisma.journal.update({
      where: { id: req.params.id },
      data: { isArchived: true },
    });
    res.json(journal);
  } catch (err) {
    if (isNotFoundError(err)) {
      return res.status(404).json({ error: "journal not found" });
    }
    throw err;
  }
});

export default router;
