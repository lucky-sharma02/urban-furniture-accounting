import type { ContactType } from "@urban-furniture/shared";
import { apiFetch } from "../api";

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  email: string;
  phone: string | null;
  address: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInput {
  name: string;
  type: ContactType;
  email: string;
  phone?: string;
  address?: string;
}

export function listContacts(includeArchived = false) {
  return apiFetch<Contact[]>(`/contacts${includeArchived ? "?includeArchived=true" : ""}`);
}

export function createContact(input: ContactInput) {
  return apiFetch<Contact>("/contacts", { method: "POST", body: JSON.stringify(input) });
}

export function updateContact(id: string, input: Partial<ContactInput>) {
  return apiFetch<Contact>(`/contacts/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function archiveContact(id: string) {
  return apiFetch<Contact>(`/contacts/${id}/archive`, { method: "PATCH" });
}
