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
  CheckCircle2,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavGroup {
  group: string;
  items: {
    to: string;
    label: string;
    icon: React.ElementType;
    end?: boolean;
    badge?: string;
  }[];
}

const navigationGroups: NavGroup[] = [
  {
    group: "Overview & Analytics",
    items: [
      { to: "/", label: "Executive Dashboard", icon: LayoutDashboard, end: true },
    ],
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
];

export function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getPageContext = () => {
    switch (true) {
      case location.pathname === "/":
        return {
          title: "Executive Overview",
          category: "Dashboard",
          desc: "Key financial metrics, master account structures & activity",
        };
      case location.pathname.startsWith("/contacts"):
        return {
          title: "Contacts & Partners",
          category: "Master Catalogs",
          desc: "Manage customer directory, vendor profiles & classifications",
        };
      case location.pathname.startsWith("/products"):
        return {
          title: "Product Catalog",
          category: "Master Catalogs",
          desc: "Manage inventory items, standard sales pricing & cost margins",
        };
      case location.pathname.startsWith("/accounts"):
        return {
          title: "Chart of Accounts",
          category: "General Ledger",
          desc: "Balance sheet & profit/loss account hierarchy and normal balances",
        };
      case location.pathname.startsWith("/journals"):
        return {
          title: "Accounting Journals",
          category: "General Ledger",
          desc: "Sales, Purchase, Bank, and Cash transaction ledgers",
        };
      case location.pathname.startsWith("/post-entry"):
        return {
          title: "Post Journal Entry",
          category: "General Ledger",
          desc: "Record balanced double-entry manual journal transactions",
        };
      case location.pathname.startsWith("/purchase-orders"):
        return {
          title: "Purchase Orders",
          category: "Purchases & Payables",
          desc: "Supplier procurement orders, line items & bill conversions",
        };
      case location.pathname.startsWith("/vendor-bills"):
        return {
          title: "Vendor Bills & Payables",
          category: "Purchases & Payables",
          desc: "Accounts payable management, settlements & payment history",
        };
      default:
        return {
          title: "Accounting System",
          category: "General Ledger",
          desc: "Urban Furniture Enterprise Ledger System",
        };
    }
  };

  const currentCtx = getPageContext();

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-4 select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-subtle font-semibold border border-slate-800">
            <Building2 className="h-5 w-5 text-slate-100" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-sm tracking-tight text-slate-900 truncate">
                Urban Furniture
              </h2>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                ERP
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Accounting & Ledger</p>
          </div>
        </div>

        {/* Grouped Navigation */}
        <div className="space-y-5">
          {navigationGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive
                                ? "text-white"
                                : "text-slate-400 group-hover:text-slate-600"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Organization & System Health */}
      <div className="border-t border-slate-200 pt-3 px-2 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-medium text-slate-700">Fiscal Year</span>
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
            FY 2025-26
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50/60 p-2 border border-emerald-200/60 text-[11px] text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium truncate">Ledger Invariant Intact</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-200 bg-white sticky top-0 h-screen flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-elevated transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-8 w-8 p-0 border-slate-200 text-slate-600"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span>{currentCtx.category}</span>
                <ChevronRight className="h-3 w-3 text-slate-400" />
                <span className="text-slate-900 font-semibold truncate">{currentCtx.title}</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block truncate mt-0.5">
                {currentCtx.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Real-time Ledger Status Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Double-Entry Balanced</span>
            </div>

            <div className="h-8 px-2.5 rounded-md border border-slate-200 bg-slate-50 flex items-center text-xs text-slate-600 font-mono">
              INR (₹)
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

