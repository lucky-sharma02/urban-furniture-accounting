import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function PortalLayout() {
  const { auth, logout } = useAuth();
  // A contact is normally only a Customer or only a Vendor, so they land straight
  // on their one relevant list. "Both" contacts get a switcher between the two.
  const showSwitcher = auth?.contactType === "Both";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-secondary/30 px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold">Urban Furniture — Portal</span>
          {showSwitcher && (
            <nav className="flex gap-1">
              <NavLink
                to="/portal/customer-invoices"
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-2 py-1 text-sm transition-colors hover:bg-secondary",
                    isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground",
                  )
                }
              >
                Invoices
              </NavLink>
              <NavLink
                to="/portal/vendor-bills"
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-2 py-1 text-sm transition-colors hover:bg-secondary",
                    isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground",
                  )
                }
              >
                Bills
              </NavLink>
            </nav>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          Log out
        </Button>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
