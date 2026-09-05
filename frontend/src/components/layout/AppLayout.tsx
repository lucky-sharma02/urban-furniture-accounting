import { NavLink, Outlet } from "react-router-dom";
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
];

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-secondary/30 p-4">
        <div className="mb-6 px-2 text-sm font-semibold">Urban Furniture</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
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
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
