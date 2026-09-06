import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  BookOpen,
  Layers,
  FileSpreadsheet,
  ShoppingCart,
  ReceiptText,
  Building2,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  FileText,
  Landmark,
  LineChart,
  PieChart,
  UserCog,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
  adminOnly?: boolean;
}

const navigationGroups: NavGroup[] = [
  {
    group: "Overview & Analytics",
    items: [{ to: "/", label: "Executive Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    group: "Master Catalogs",
    items: [
      { to: "/contacts", label: "Contacts & CRM", icon: Users },
      { to: "/products", label: "Product Master", icon: Package },
    ],
  },
  {
    group: "General Ledger",
    items: [
      { to: "/accounts", label: "Chart of Accounts", icon: BookOpen },
      { to: "/journals", label: "Accounting Journals", icon: Layers },
      { to: "/journal-entries", label: "Journal Entries", icon: FileText },
      { to: "/post-entry", label: "Post Journal Entry", icon: FileSpreadsheet },
    ],
  },
  {
    group: "Purchases & Payables",
    items: [
      { to: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      { to: "/vendor-bills", label: "Vendor Bills", icon: ReceiptText },
    ],
  },
  {
    group: "Sales & Receivables",
    items: [
      { to: "/sales-orders", label: "Sales Orders", icon: FileText },
      { to: "/customer-invoices", label: "Customer Invoices", icon: Landmark },
    ],
  },
  {
    group: "Financial Reports",
    items: [
      { to: "/reports/balance-sheet", label: "Balance Sheet", icon: Landmark },
      { to: "/reports/profit-and-loss", label: "Profit & Loss", icon: LineChart },
      { to: "/reports/budget", label: "Budget Report", icon: PieChart },
    ],
  },
  {
    group: "Administration",
    adminOnly: true,
    items: [{ to: "/users", label: "User Management", icon: UserCog }],
  },
];

interface PageContext {
  title: string;
  category: string;
  desc: string;
}

const PAGE_CONTEXT: { match: (path: string) => boolean; ctx: PageContext }[] = [
  {
    match: (p) => p === "/",
    ctx: {
      title: "Financial Dashboard",
      category: "Overview & Analytics",
      desc: "Key financial metrics, master account structures & activity",
    },
  },
  {
    match: (p) => p.startsWith("/contacts"),
    ctx: {
      title: "Contacts & Partners",
      category: "Master Catalogs",
      desc: "Manage customer directory, vendor profiles & classifications",
    },
  },
  {
    match: (p) => p.startsWith("/products"),
    ctx: {
      title: "Product Catalog",
      category: "Master Catalogs",
      desc: "Manage inventory items, standard sales pricing & cost margins",
    },
  },
  {
    match: (p) => p.startsWith("/accounts"),
    ctx: {
      title: "Chart of Accounts",
      category: "General Ledger",
      desc: "Balance sheet & profit/loss account hierarchy and normal balances",
    },
  },
  {
    match: (p) => p.startsWith("/journals"),
    ctx: {
      title: "Accounting Journals",
      category: "General Ledger",
      desc: "Sales, Purchase, Bank, and Cash transaction ledgers",
    },
  },
  {
    match: (p) => p.startsWith("/journal-entries"),
    ctx: {
      title: "Journal Entries",
      category: "General Ledger",
      desc: "Every posted ledger entry — date, number, partner, journal and total",
    },
  },
  {
    match: (p) => p.startsWith("/post-entry"),
    ctx: {
      title: "Post Journal Entry",
      category: "General Ledger",
      desc: "Record balanced double-entry manual journal transactions",
    },
  },
  {
    match: (p) => p.startsWith("/purchase-orders"),
    ctx: {
      title: "Purchase Orders",
      category: "Purchases & Payables",
      desc: "Supplier procurement orders, line items & bill conversions",
    },
  },
  {
    match: (p) => p.startsWith("/vendor-bills"),
    ctx: {
      title: "Vendor Bills & Payables",
      category: "Purchases & Payables",
      desc: "Accounts payable management, settlements & payment history",
    },
  },
  {
    match: (p) => p.startsWith("/sales-orders"),
    ctx: {
      title: "Sales Orders",
      category: "Sales & Receivables",
      desc: "Customer sales orders, line items & invoice generation",
    },
  },
  {
    match: (p) => p.startsWith("/customer-invoices"),
    ctx: {
      title: "Customer Invoices & Receivables",
      category: "Sales & Receivables",
      desc: "Accounts receivable, GST invoicing, settlements & payment history",
    },
  },
  {
    match: (p) => p.startsWith("/reports/balance-sheet"),
    ctx: {
      title: "Balance Sheet",
      category: "Financial Reports",
      desc: "Assets against liabilities and capital at a point in time",
    },
  },
  {
    match: (p) => p.startsWith("/reports/profit-and-loss"),
    ctx: {
      title: "Profit & Loss",
      category: "Financial Reports",
      desc: "Income against expenses over a reporting period",
    },
  },
  {
    match: (p) => p.startsWith("/reports/budget"),
    ctx: {
      title: "Budget Report",
      category: "Financial Reports",
      desc: "Committed against achieved by budget analytic — Income & Expenses",
    },
  },
  {
    match: (p) => p.startsWith("/users"),
    ctx: {
      title: "User Management",
      category: "Administration",
      desc: "Application users, roles and access control",
    },
  },
];

const DEFAULT_CONTEXT: PageContext = {
  title: "Accounting System",
  category: "General Ledger",
  desc: "Urban Furniture Enterprise Ledger System",
};

export function AppLayout() {
  const location = useLocation();
  const { auth, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = auth?.role === "Admin";
  const groups = navigationGroups.filter((g) => !g.adminOnly || isAdmin);
  const currentCtx = PAGE_CONTEXT.find((e) => e.match(location.pathname))?.ctx ?? DEFAULT_CONTEXT;

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-4 select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 font-semibold text-white shadow-subtle">
            <Building2 className="h-5 w-5 text-slate-100" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold tracking-tight text-slate-900">
              Urban Furniture
            </h2>
            <p className="text-[11px] font-medium text-slate-500">Accounting &amp; Ledger</p>
          </div>
        </div>

        {/* Grouped Navigation */}
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.group} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.group}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-slate-900 text-white shadow-subtle"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600",
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-2 border-t border-slate-200 px-2 pt-3">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50/60 p-2 text-[11px] text-emerald-800">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="truncate font-medium">Ledger Invariant Intact</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="h-8 w-full justify-start gap-2 px-2 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4 text-slate-400" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-elevated transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="absolute right-3 top-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(false)}
            className="h-8 w-8 p-0 text-slate-500"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileOpen(true)}
              className="h-8 w-8 border-slate-200 p-0 text-slate-600 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span>{currentCtx.category}</span>
                <ChevronRight className="h-3 w-3 text-slate-400" />
                <span className="truncate font-semibold text-slate-900">{currentCtx.title}</span>
              </div>
              <p className="mt-0.5 hidden truncate text-[11px] text-slate-500 sm:block">
                {currentCtx.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {auth?.role && (
              <div className="hidden h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 sm:flex">
                {auth.role}
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
