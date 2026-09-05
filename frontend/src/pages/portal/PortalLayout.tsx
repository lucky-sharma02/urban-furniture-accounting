import { NavLink, Outlet } from "react-router-dom";
import { Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function PortalLayout() {
  const { auth, logout } = useAuth();
  // A contact is normally only a Customer or only a Vendor, so they land straight
  // on their one relevant list. "Both" contacts get a switcher between the two.
  const showSwitcher = auth?.contactType === "Both";

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
      isActive ? "bg-slate-900 text-white shadow-subtle" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-white shadow-subtle">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-slate-900">Urban Furniture</span>
                <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                  Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Your invoices &amp; payments</p>
            </div>
          </div>
          {showSwitcher && (
            <nav className="flex gap-1">
              <NavLink to="/portal/customer-invoices" className={navClass}>
                Invoices
              </NavLink>
              <NavLink to="/portal/vendor-bills" className={navClass}>
                Bills
              </NavLink>
            </nav>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="h-8 gap-1.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="h-3.5 w-3.5 text-slate-400" />
          Sign out
        </Button>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
