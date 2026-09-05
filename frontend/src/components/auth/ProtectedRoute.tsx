import type { UserRole } from "@urban-furniture/shared";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute() {
  const { auth } = useAuth();
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

interface RequireRoleProps {
  roles: UserRole[];
}

export function RequireRole({ roles }: RequireRoleProps) {
  const { auth } = useAuth();
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(auth.role)) {
    return <Navigate to={auth.role === "Contact" ? "/portal" : "/"} replace />;
  }
  return <Outlet />;
}
