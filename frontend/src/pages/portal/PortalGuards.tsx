import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

function homePath(contactType: string | null | undefined): string {
  return contactType === "Vendor" ? "/portal/vendor-bills" : "/portal/customer-invoices";
}

/** The bare /portal route — send the contact to their one relevant list. */
export function PortalIndexRedirect() {
  const { auth } = useAuth();
  return <Navigate to={homePath(auth?.contactType)} replace />;
}

/**
 * Wraps a portal sub-route (e.g. vendor-bills) and bounces a contact who has no
 * business there — a pure Customer hitting /portal/vendor-bills by URL, or vice
 * versa. "Both" contacts pass through to either area.
 */
export function RequirePortalArea({ area }: { area: "Customer" | "Vendor" }) {
  const { auth } = useAuth();
  const type = auth?.contactType;
  if (type && type !== "Both" && type !== area) {
    return <Navigate to={homePath(type)} replace />;
  }
  return <Outlet />;
}
