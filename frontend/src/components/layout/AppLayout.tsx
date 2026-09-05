import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/contacts", label: "Contacts" },
  { to: "/products", label: "Products" },
  { to: "/accounts", label: "Chart of Accounts" },
  { to: "/journals", label: "Journals" },
  { to: "/post-entry", label: "Post Entry" },
  { to: "/purchase-orders", label: "Purchase Orders" },
  { to: "/vendor-bills", label: "Vendor Bills" },
  { to: "/sales-orders", label: "Sales Orders" },
  { to: "/customer-invoices", label: "Customer Invoices" },
  { to: "/reports/balance-sheet", label: "Balance Sheet" },
  { to: "/reports/profit-and-loss", label: "Profit & Loss" },
  { to: "/reports/budget", label: "Budget Report" },
];

export function AppLayout() {
  const { auth, logout } = useAuth();
  const items = auth?.role === "Admin" ? [...navItems, { to: "/users", label: "Users" }] : navItems;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-secondary/30 p-4">
        <div className="mb-6 px-2 text-sm font-semibold">Urban Furniture</div>
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary",
                  isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" size="sm" className="mt-auto w-full justify-start" onClick={logout}>
          Log out
        </Button>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
