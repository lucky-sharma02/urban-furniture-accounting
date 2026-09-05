import type { UserRole } from "@urban-furniture/shared";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { login as loginRequest, type ContactType } from "./api/auth";

interface AuthState {
  token: string;
  role: UserRole;
  contactId: string | null;
  contactType: ContactType | null;
}

interface AuthContextValue {
  auth: AuthState | null;
  login: (email: string, password: string) => Promise<AuthState>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth(): AuthState | null {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") as UserRole | null;
  const contactId = localStorage.getItem("contactId");
  const contactType = localStorage.getItem("contactType") as ContactType | null;
  if (!token || !role) return null;
  return { token, role, contactId: contactId || null, contactType: contactType || null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => readStoredAuth());

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      async login(email: string, password: string) {
        const res = await loginRequest(email, password);
        localStorage.setItem("token", res.token);
        localStorage.setItem("role", res.role);
        if (res.contactId) {
          localStorage.setItem("contactId", res.contactId);
        } else {
          localStorage.removeItem("contactId");
        }
        if (res.contactType) {
          localStorage.setItem("contactType", res.contactType);
        } else {
          localStorage.removeItem("contactType");
        }
        const next: AuthState = {
          token: res.token,
          role: res.role,
          contactId: res.contactId,
          contactType: res.contactType,
        };
        setAuth(next);
        return next;
      },
      logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("contactId");
        localStorage.removeItem("contactType");
        setAuth(null);
      },
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
