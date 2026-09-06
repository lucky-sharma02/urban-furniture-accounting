import { randomUUID } from "node:crypto";
import { Router } from "express";
import { formatRef } from "../lib/format-ref";
import { postJournalEntry, UnbalancedJournalEntryError } from "../lib/journal-engine";
import { prisma } from "../lib/prisma";

const router = Router();

// List view: Date | Number | Partner | Journal | Total | Status.
// `total` is the sum of the debit column (== credit column for a balanced entry).
router.get("/", async (req, res) => {
  const where = typeof req.query.journalId === "string" ? { journalId: req.query.journalId } : {};

  const entries = await prisma.journalEntry.findMany({
    where,
    include: {
      journal: { select: { name: true, type: true } },
      lines: { include: { partner: { select: { name: true } } } },
    },
    orderBy: [{ date: "desc" }, { refNumber: "desc" }],
  });

  res.json(
    entries.map((entry) => {
      const total = entry.lines.reduce((sum, l) => sum + l.debit.toNumber(), 0);
      const partner = entry.lines.find((l) => l.partner)?.partner?.name ?? null;
      return {
        id: entry.id,
        refNumber: formatRef("JE", entry.refNumber, entry.date),
        date: entry.date.toISOString(),
        journalName: entry.journal.name,
        journalType: entry.journal.type,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        reference: entry.reference,
        partner,
        total,
        status: entry.status,
      };
    }),
  );
});

interface LineInput {
  accountId: string;
  partnerId?: string;
  debit: number;
  credit: number;
}

function isValidLine(line: unknown): line is LineInput {
  if (typeof line !== "object" || line === null) return false;
  const l = line as Record<string, unknown>;
  return (
    typeof l.accountId === "string" &&
    l.accountId.length > 0 &&
    typeof l.debit === "number" &&
    typeof l.credit === "number" &&
    (l.partnerId === undefined || typeof l.partnerId === "string")
  );
}

// Manual journal entry posting — the backend counterpart to the Post screen.
// Always routes through postJournalEntry() so the balance rule can never be bypassed.
router.post("/", async (req, res) => {
  const { journalId, date, reference, lines } = req.body;

  if (typeof journalId !== "string" || journalId.length === 0) {
    return res.status(400).json({ error: "journalId is required" });
  }
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "a valid date is required" });
  }
  if (!Array.isArray(lines) || lines.length < 2 || !lines.every(isValidLine)) {
    return res.status(400).json({
      error: "at least two lines are required, each with accountId, debit, and credit",
    });
  }

  try {
    const entry = await postJournalEntry({
      journalId,
      date: new Date(date),
      reference: typeof reference === "string" ? reference : undefined,
      sourceType: "Manual",
      sourceId: randomUUID(),
      lines,
    });

    res.status(201).json({
      ...entry,
      refNumber: formatRef("JE", entry.refNumber, entry.date),
      lines: entry.lines.map((line) => ({
        ...line,
        debit: line.debit.toNumber(),
        credit: line.credit.toNumber(),
      })),
    });
  } catch (err) {
    if (err instanceof UnbalancedJournalEntryError || err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

export default router;
