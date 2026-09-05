import type { UserRole } from "@urban-furniture/shared";
import { apiFetch } from "../api";

export type ContactType = "Vendor" | "Customer" | "Both";

export interface LoginResponse {
  token: string;
  role: UserRole;
  contactId: string | null;
  contactType: ContactType | null;
}

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
