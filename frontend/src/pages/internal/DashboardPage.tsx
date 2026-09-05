import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Package,
  BookOpen,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Building,
  ShieldCheck,
  Plus,
  ArrowRight,
} from "lucide-react";
import { listContacts, type Contact } from "@/lib/api/contacts";
import { listProducts, type Product } from "@/lib/api/products";
import { listAccounts, type Account } from "@/lib/api/accounts";
import { listJournals, type Journal } from "@/lib/api/journals";
import { Button } from "@/components/ui/button";

export function DashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [c, p, a, j] = await Promise.all([
          listContacts().catch(() => []),
          listProducts().catch(() => []),
          listAccounts().catch(() => []),
          listJournals().catch(() => []),
        ]);
        setContacts(c);
        setProducts(p);
        setAccounts(a);
        setJournals(j);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const customersCount = contacts.filter((c) => c.type === "Customer" || c.type === "Both").length;
  const vendorsCount = contacts.filter((c) => c.type === "Vendor" || c.type === "Both").length;

  const assetCount = accounts.filter((a) => a.type === "Asset" || a.type === "Bank" || a.type === "Cash").length;
  const liabilityCount = accounts.filter((a) => a.type === "Liability" || a.type === "Capital").length;
  const incomeCount = accounts.filter((a) => a.type === "Income").length;
  const expenseCount = accounts.filter((a) => a.type === "Expenses" || a.type === "OtherExpenses").length;

  const totalBSAccounts = assetCount + liabilityCount;
  const totalPLAccounts = incomeCount + expenseCount;

  return (
    <div className="space-y-8">
      {/* Executive Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">
            Financial Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time accounting ledger overview, balance equation audits, and enterprise catalogs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/post-entry">
            <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle">
              <Plus className="h-3.5 w-3.5" />
              <span>Post Journal Entry</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contacts & CRM */}
        <div className="group p-5 rounded-lg border border-slate-200 bg-white shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Contacts & CRM
              </span>
              <div className="h-8 w-8 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums font-display">
              {loading ? "..." : contacts.length}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                {customersCount} Customers
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200">
                {vendorsCount} Vendors
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Master Directory</span>
            <Link to="/contacts" className="text-slate-900 font-semibold hover:text-slate-700 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              View CRM <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Product Catalog */}
        <div className="group p-5 rounded-lg border border-slate-200 bg-white shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Product Catalog
              </span>
              <div className="h-8 w-8 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums font-display">
              {loading ? "..." : products.length}
            </div>
            <p className="mt-2 text-xs text-slate-500 truncate">
              Furniture inventory items & active SKUs
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Inventory Items</span>
            <Link to="/products" className="text-slate-900 font-semibold hover:text-slate-700 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Manage <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Chart of Accounts */}
        <div className="group p-5 rounded-lg border border-slate-200 bg-white shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Chart of Accounts
              </span>
              <div className="h-8 w-8 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums font-display">
              {loading ? "..." : accounts.length}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-slate-600 font-medium">{totalBSAccounts} Balance Sheet</span>
              <span>·</span>
              <span className="text-slate-600 font-medium">{totalPLAccounts} P&L</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">GL Structure</span>
            <Link to="/accounts" className="text-slate-900 font-semibold hover:text-slate-700 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Ledger <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Accounting Journals */}
        <div className="group p-5 rounded-lg border border-slate-200 bg-white shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Journals
              </span>
              <div className="h-8 w-8 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums font-display">
              {loading ? "..." : journals.length}
            </div>
            <p className="mt-2 text-xs text-slate-500 truncate">
              Sales, Purchase, Bank & Cash books
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Transaction Books</span>
            <Link to="/journals" className="text-slate-900 font-semibold hover:text-slate-700 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Journals <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Ledger Architecture Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Sheet Accounts Box */}
        <div className="p-6 rounded-lg border border-slate-200 bg-white shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                <Building className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-900 font-display">Balance Sheet Accounts</h3>
                <p className="text-[11px] text-slate-500">Permanent Ledger Architecture</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Permanent
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Assets, Liabilities, Bank accounts, Petty Cash, and Capital equity accounts that retain cumulative balances across fiscal accounting periods.
          </p>

          {/* Visual Ratio Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium text-slate-600">
              <span>Debit Normal (Assets)</span>
              <span>Credit Normal (Liabilities / Capital)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full transition-all duration-500"
                style={{
                  width: `${totalBSAccounts > 0 ? (assetCount / totalBSAccounts) * 100 : 50}%`,
                }}
              />
              <div
                className="bg-amber-600 h-full transition-all duration-500"
                style={{
                  width: `${totalBSAccounts > 0 ? (liabilityCount / totalBSAccounts) * 100 : 50}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Debit Normal</span>
                <span className="text-[10px] font-mono text-emerald-700 font-semibold px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200">Asset/Bank/Cash</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums font-display">{assetCount}</p>
              <span className="text-[10px] text-slate-400">Total Accounts</span>
            </div>
            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Credit Normal</span>
                <span className="text-[10px] font-mono text-amber-800 font-semibold px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200">Liability/Equity</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums font-display">{liabilityCount}</p>
              <span className="text-[10px] text-slate-400">Total Accounts</span>
            </div>
          </div>
        </div>

        {/* Profit & Loss Box */}
        <div className="p-6 rounded-lg border border-slate-200 bg-white shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-900 font-display">Profit & Loss Accounts</h3>
                <p className="text-[11px] text-slate-500">Nominal Cycle Ledger</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Nominal
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Operating revenues, product sales, material purchases, and operational overhead accounts tracked across the active financial cycle.
          </p>

          {/* Visual Ratio Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium text-slate-600">
              <span>Revenues (Income Credit)</span>
              <span>Expenses (Cost Debit)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full transition-all duration-500"
                style={{
                  width: `${totalPLAccounts > 0 ? (incomeCount / totalPLAccounts) * 100 : 50}%`,
                }}
              />
              <div
                className="bg-rose-600 h-full transition-all duration-500"
                style={{
                  width: `${totalPLAccounts > 0 ? (expenseCount / totalPLAccounts) * 100 : 50}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Revenues</span>
                <span className="text-[10px] font-mono text-emerald-700 font-semibold px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200">Income Credit</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums font-display">{incomeCount}</p>
              <span className="text-[10px] text-slate-400">Total Accounts</span>
            </div>
            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Expenses</span>
                <span className="text-[10px] font-mono text-rose-700 font-semibold px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200">Cost Debit</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums font-display">{expenseCount}</p>
              <span className="text-[10px] text-slate-400">Total Accounts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounting System Invariants Audit Banner */}
      <div className="p-5 rounded-lg border border-slate-200 bg-white shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-900">
              Automated Double-Entry Ledger Verification
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial invariants guarantee <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800 border border-slate-200">Total Debit == Total Credit</code> across all posted transactions.
            </p>
          </div>
        </div>

        <Link to="/accounts">
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-700">
            <span>Chart of Accounts</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
