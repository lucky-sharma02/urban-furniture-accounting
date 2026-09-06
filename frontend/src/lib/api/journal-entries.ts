import type { JournalEntryStatus, JournalEntrySourceType } from "@urban-furniture/shared";
import { apiFetch } from "../api";

export interface JournalEntryLineInput {
  accountId: string;
  partnerId?: string;
  debit: number;
  credit: number;
}

export interface CreateJournalEntryInput {
  journalId: string;
  date: string;
  reference?: string;
  lines: JournalEntryLineInput[];
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  partnerId: string | null;
  debit: number;
  credit: number;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  journalId: string;
  date: string;
  reference: string | null;
  sourceType: JournalEntrySourceType;
  sourceId: string;
  status: JournalEntryStatus;
  lines: JournalEntryLine[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryListRow {
  id: string;
  refNumber: string;
  date: string;
  journalName: string;
  journalType: string;
  sourceType: JournalEntrySourceType;
  sourceId: string;
  reference: string | null;
  partner: string | null;
  total: number;
  status: JournalEntryStatus;
}

export function listJournalEntries(journalId?: string) {
  return apiFetch<JournalEntryListRow[]>(
    `/journal-entries${journalId ? `?journalId=${journalId}` : ""}`,
  );
}

export function createJournalEntry(input: CreateJournalEntryInput) {
  return apiFetch<JournalEntry>("/journal-entries", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
