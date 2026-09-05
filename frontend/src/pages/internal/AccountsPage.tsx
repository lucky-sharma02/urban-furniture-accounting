
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountFormDialog } from "@/components/master-data/AccountFormDialog";
import {
  archiveAccount,
  listAccounts,
  type Account,
} from "@/lib/api/accounts";
import type { AccountType } from "@urban-furniture/shared";
import {
  Plus,
  BookOpen,
  Edit,
  Archive,
  Scale,
} from "lucide-react";

/**
 * Account classifications that appear on the Balance Sheet.
 */
const BALANCE_SHEET_TYPES: AccountType[] = [
  "Asset",
  "Liability",
  "Bank",
  "Cash",
  "Capital",
];

/**
 * Account classifications that appear on the Profit & Loss statement.
 */
const PL_TYPES: AccountType[] = [
  "Income",
  "Expenses",
  "OtherExpenses",
];

/**
 * Normal balance side for each account type.
 *
 * This is kept locally instead of importing
 * ACCOUNT_TYPE_NORMAL_SIDE from @urban-furniture/shared
 * because the current shared/dist build does not export it.
 */
const ACCOUNT_TYPE_NORMAL_SIDE: Record<AccountType, "Debit" | "Credit"> = {
  Asset: "Debit",
  Liability: "Credit",
  Bank: "Debit",
  Cash: "Debit",
  Capital: "Credit",
  Income: "Credit",
  Expenses: "Debit",
  OtherExpenses: "Debit",
};

type FilterCategory = "ALL" | "BALANCE_SHEET" | "PL" | AccountType;

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(
    undefined
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterCategory>("ALL");

  /**
   * Load accounts from the backend.
   */
  async function load() {
    setLoading(true);

    try {
      const data = await listAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Load accounts when the page is mounted.
   */
  useEffect(() => {
    load();
  }, []);

  /**
   * Archive an account.
   */
  async function handleArchive(id: string) {
    if (!confirm("Are you sure you want to archive this account?")) {
      return;
    }

    try {
      await archiveAccount(id);
      await load();
    } catch (error) {
      console.error("Failed to archive account:", error);
    }
  }

  /**
   * Open the form for creating a new account.
   */
  function openCreateForm() {
    setEditingAccount(undefined);
    setFormOpen(true);
  }

  /**
   * Open the form for editing an existing account.
   */
  function openEditForm(account: Account) {
    setEditingAccount(account);
    setFormOpen(true);
  }

  /**
   * Filter accounts based on search text and selected category.
   */
  const filteredAccounts = accounts.filter((acc) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      acc.name.toLowerCase().includes(searchText) ||
      acc.type.toLowerCase().includes(searchText);

    if (!matchesSearch) {
      return false;
    }

    if (filter === "ALL") {
      return true;
    }

    if (filter === "BALANCE_SHEET") {
      return BALANCE_SHEET_TYPES.includes(acc.type);
    }

    if (filter === "PL") {
      return PL_TYPES.includes(acc.type);
    }

    return acc.type === filter;
  });

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <SearchBar onSearch={setSearch} placeholder="Search accounts by name or type — press Enter" />

        {/* Filter Pills & Add Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("ALL")}
              className={`h-7 text-xs px-2.5 transition-all ${
                filter === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Ledgers
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("BALANCE_SHEET")}
              className={`h-7 text-xs px-2.5 transition-all ${
                filter === "BALANCE_SHEET"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Balance Sheet
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("PL")}
              className={`h-7 text-xs px-2.5 transition-all ${
                filter === "PL"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Profit & Loss
            </Button>
          </div>

          <Button
            onClick={openCreateForm}
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Account</span>
          </Button>
        </div>
      </div>

      {/* Account Form */}
      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editingAccount}
        onSaved={load}
      />

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading chart of accounts...
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-dashed border-slate-200 bg-white shadow-card">
          <BookOpen className="h-8 w-8 text-slate-400 mx-auto mb-2" />

          <p className="text-sm font-semibold text-slate-900">
            No accounts found
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Configure your ledger accounts to structure financial statements
            and double-entry posts.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-card">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200">
                <TableHead className="text-xs font-semibold text-slate-700">
                  Account Title
                </TableHead>

                <TableHead className="text-xs font-semibold text-slate-700">
                  Classification Type
                </TableHead>

                <TableHead className="text-xs font-semibold text-slate-700">
                  Financial Statement
                </TableHead>

                <TableHead className="text-xs font-semibold text-slate-700">
                  Normal Balance
                </TableHead>

                <TableHead className="text-right text-xs font-semibold text-slate-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredAccounts.map((account) => {
                const isBS = BALANCE_SHEET_TYPES.includes(account.type);

                const normalSide =
                  ACCOUNT_TYPE_NORMAL_SIDE[account.type] ?? "Debit";

                return (
                  <TableRow
                    key={account.id}
                    className="border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    {/* Account Name */}
                    <TableCell className="font-medium text-xs text-slate-900 flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-slate-500" />

                      <span>{account.name}</span>
                    </TableCell>

                    {/* Account Type */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 font-mono font-medium"
                      >
                        {account.type}
                      </Badge>
                    </TableCell>

                    {/* Financial Statement */}
                    <TableCell>
                      <span className="text-xs text-slate-600">
                        {isBS
                          ? "Balance Sheet (Permanent)"
                          : "Profit & Loss (Nominal)"}
                      </span>
                    </TableCell>

                    {/* Normal Balance */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${
                          normalSide === "Debit"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        <Scale className="h-2.5 w-2.5" />

                        {normalSide}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(account)}
                          className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-100"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(account.id)}
                          className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          <Archive className="h-3 w-3 mr-1" />
                          Archive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

