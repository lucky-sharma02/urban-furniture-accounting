import type { JournalType } from "@urban-furniture/shared";
import { apiFetch } from "../api";

export interface Journal {
  id: string;
  name: string;
  type: JournalType;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalInput {
  name: string;
  type: JournalType;
}

export function listJournals(includeArchived = false) {
  return apiFetch<Journal[]>(`/journals${includeArchived ? "?includeArchived=true" : ""}`);
}

export function createJournal(input: JournalInput) {
  return apiFetch<Journal>("/journals", { method: "POST", body: JSON.stringify(input) });
}

export function updateJournal(id: string, input: Partial<JournalInput>) {
  return apiFetch<Journal>(`/journals/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function archiveJournal(id: string) {
  return apiFetch<Journal>(`/journals/${id}/archive`, { method: "PATCH" });
}
