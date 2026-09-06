import { Router } from "express";
import { buildBudgetReport } from "../lib/budget";
import { prisma } from "../lib/prisma";

const router = Router();

interface LineInput {
  analyticAccountId: string;
  type: "Income" | "Expenses";
  committedAmount: number;
}

function parseLines(raw: unknown): LineInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const lines: LineInput[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;
    const l = item as Record<string, unknown>;
    if (typeof l.analyticAccountId !== "string" || l.analyticAccountId.length === 0) return null;
    if (l.type !== "Income" && l.type !== "Expenses") return null;
    if (typeof l.committedAmount !== "number" || l.committedAmount <= 0) return null;
    lines.push({ analyticAccountId: l.analyticAccountId, type: l.type, committedAmount: l.committedAmount });
  }
  return lines;
}

function parseHeader(body: Record<string, unknown>) {
  if (typeof body.name !== "string" || body.name.trim() === "") {
    return { error: "name is required" as const };
  }
  if (typeof body.periodStart !== "string" || Number.isNaN(Date.parse(body.periodStart))) {
    return { error: "a valid periodStart is required" as const };
  }
  if (typeof body.periodEnd !== "string" || Number.isNaN(Date.parse(body.periodEnd))) {
    return { error: "a valid periodEnd is required" as const };
  }
  if (Date.parse(body.periodEnd) < Date.parse(body.periodStart)) {
    return { error: "periodEnd must be on or after periodStart" as const };
  }
  const lines = parseLines(body.lines);
  if (!lines) {
    return { error: "at least one line is required (analyticAccountId, type, committedAmount > 0)" as const };
  }
  const responsibleId =
    typeof body.responsibleId === "string" && body.responsibleId.length > 0 ? body.responsibleId : null;

  return {
    data: {
      name: body.name.trim(),
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      responsibleId,
      lines,
    },
  };
}

router.get("/", async (_req, res) => {
  res.json(await buildBudgetReport());
});

router.post("/", async (req, res) => {
  const parsed = parseHeader(req.body ?? {});
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  const budget = await prisma.budget.create({
    data: {
      name: parsed.data.name,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      responsibleId: parsed.data.responsibleId,
      lines: {
        create: parsed.data.lines.map((l) => ({
          analyticAccountId: l.analyticAccountId,
          type: l.type,
          committedAmount: l.committedAmount,
        })),
      },
    },
  });
  res.status(201).json({ id: budget.id });
});

// Full replace of a budget's header and lines — only while still Draft.
router.put("/:id", async (req, res) => {
  const existing = await prisma.budget.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "budget not found" });
  if (existing.status !== "Draft") {
    return res.status(400).json({ error: "only a Draft budget can be edited" });
  }

  const parsed = parseHeader(req.body ?? {});
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  await prisma.$transaction(async (tx) => {
    await tx.budgetLine.deleteMany({ where: { budgetId: existing.id } });
    await tx.budget.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
        responsibleId: parsed.data.responsibleId,
        lines: {
          create: parsed.data.lines.map((l) => ({
            analyticAccountId: l.analyticAccountId,
            type: l.type,
            committedAmount: l.committedAmount,
          })),
        },
      },
    });
  });
  res.json({ id: existing.id });
});

router.post("/:id/confirm", async (req, res) => {
  const existing = await prisma.budget.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "budget not found" });
  if (existing.status !== "Draft") {
    return res.status(400).json({ error: "only a Draft budget can be confirmed" });
  }
  await prisma.budget.update({ where: { id: existing.id }, data: { status: "Confirmed" } });
  res.json({ id: existing.id, status: "Confirmed" });
});

router.post("/:id/cancel", async (req, res) => {
  const existing = await prisma.budget.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "budget not found" });
  if (existing.status === "Cancelled") {
    return res.status(400).json({ error: "budget is already cancelled" });
  }
  await prisma.budget.update({ where: { id: existing.id }, data: { status: "Cancelled" } });
  res.json({ id: existing.id, status: "Cancelled" });
});

// Revise: clone a Confirmed budget into a fresh Draft ("<name> (Revised)"), link it
// back to the original, and mark the original Revised (read-only history). Per-line
// committed amounts can be overridden by id in the body; omitted lines carry over.
router.post("/:id/revise", async (req, res) => {
  const existing = await prisma.budget.findUnique({
    where: { id: req.params.id },
    include: { lines: true },
  });
  if (!existing) return res.status(404).json({ error: "budget not found" });
  if (existing.status !== "Confirmed") {
    return res.status(400).json({ error: "only a Confirmed budget can be revised" });
  }

  const overrides: Record<string, number> = {};
  if (Array.isArray(req.body?.lines)) {
    for (const l of req.body.lines) {
      if (
        l &&
        typeof l.id === "string" &&
        typeof l.committedAmount === "number" &&
        l.committedAmount > 0
      ) {
        overrides[l.id] = l.committedAmount;
      }
    }
  }

  const revision = await prisma.$transaction(async (tx) => {
    const created = await tx.budget.create({
      data: {
        name: `${existing.name} (Revised)`,
        periodStart: existing.periodStart,
        periodEnd: existing.periodEnd,
        responsibleId: existing.responsibleId,
        status: "Draft",
        revisedFromId: existing.id,
        lines: {
          create: existing.lines.map((l) => ({
            analyticAccountId: l.analyticAccountId,
            type: l.type,
            committedAmount: overrides[l.id] ?? l.committedAmount.toNumber(),
          })),
        },
      },
    });
    await tx.budget.update({ where: { id: existing.id }, data: { status: "Revised" } });
    return created;
  });

  res.status(201).json({ id: revision.id });
});

export default router;
