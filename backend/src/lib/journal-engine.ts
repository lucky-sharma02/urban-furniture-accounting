import type { JournalEntrySourceType } from "@prisma/client";
import { prisma } from "./prisma";

export interface JournalEntryLineInput {
  accountId: string;
  partnerId?: string;
  debit: number;
  credit: number;
}

export interface PostJournalEntryInput {
  journalId: string;
  date: Date;
  reference?: string;
  sourceType: JournalEntrySourceType;
  sourceId: string;
  lines: JournalEntryLineInput[];
}

export class UnbalancedJournalEntryError extends Error {
  constructor(totalDebit: number, totalCredit: number) {
    super(`journal entry is unbalanced: debit ${totalDebit} !== credit ${totalCredit}`);
    this.name = "UnbalancedJournalEntryError";
  }
}

// Rounds to cents before comparing so floating point noise (e.g. 0.1 + 0.2) never
// causes a false "unbalanced" rejection or a false pass.
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// The only function allowed to write a JournalEntryLine — every post*() mapping
// function in this module must route through here so the balance check is never bypassed.
export async function postJournalEntry(input: PostJournalEntryInput) {
  if (input.lines.length < 2) {
    throw new Error("a journal entry must have at least two lines");
  }

  for (const line of input.lines) {
    if (line.debit < 0 || line.credit < 0) {
      throw new Error("debit and credit amounts must be non-negative");
    }
    if (line.debit > 0 && line.credit > 0) {
      throw new Error("a journal entry line cannot have both a debit and a credit amount");
    }
    if (line.debit === 0 && line.credit === 0) {
      throw new Error("a journal entry line must have either a debit or a credit amount");
    }
  }

  const totalDebit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = input.lines.reduce((sum, line) => sum + line.credit, 0);

  if (toCents(totalDebit) !== toCents(totalCredit)) {
    throw new UnbalancedJournalEntryError(totalDebit, totalCredit);
  }

  return prisma.$transaction(async (tx) => {
    return tx.journalEntry.create({
      data: {
        journalId: input.journalId,
        date: input.date,
        reference: input.reference,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        status: "Posted",
        lines: {
          create: input.lines.map((line) => ({
            accountId: line.accountId,
            partnerId: line.partnerId,
            debit: line.debit,
            credit: line.credit,
          })),
        },
      },
      include: { lines: true },
    });
  });
}
