import { apiFetch } from "../api";

// Roles shown in the New User form. "Vendor" / "Customer" are portal logins —
// the backend turns each into a Contact of that type plus a scoped login.
export type NewUserRole = "Admin" | "Accountant" | "Vendor" | "Customer";

export interface AppUser {
  id: string;
  email: string;
  role: string;
  contactId: string | null;
  contactName: string | null;
  createdAt: string;
}

export interface CreateUserInput {
  // Required only for Vendor / Customer — it's the contact's name.
  name?: string;
  email: string;
  password: string;
  role: NewUserRole;
}

export function listUsers() {
  return apiFetch<AppUser[]>("/users");
}

export function createUser(input: CreateUserInput) {
  return apiFetch<AppUser>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
