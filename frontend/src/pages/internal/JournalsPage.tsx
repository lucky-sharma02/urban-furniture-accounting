import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JournalFormDialog } from "@/components/master-data/JournalFormDialog";
import { archiveJournal, listJournals, type Journal } from "@/lib/api/journals";
import { Plus, Layers, Edit, Archive, TrendingUp, Receipt, Landmark, Wallet, LayoutGrid, List } from "lucide-react";
import type { JournalType } from "@urban-furniture/shared";

type ViewMode = "grid" | "list";

const JOURNAL_THEMES: Record<
  JournalType,
  {
    icon: React.ElementType;
    color: string;
    bg: string;
    badge: string;
    description: string;
  }
> = {
  Sales: {
    icon: TrendingUp,
    color: "text-blue-700 bg-blue-50 border-blue-200",
    bg: "border-slate-200 hover:border-slate-300",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Customer invoices, sales revenues, receivables, and client collections.",
  },
  Purchase: {
    icon: Receipt,
    color: "text-indigo-700 bg-indigo-50 border-indigo-200",
    bg: "border-slate-200 hover:border-slate-300",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    description: "Vendor bills, inventory expenses, accounts payable, and supplier orders.",
  },
  Bank: {
    icon: Landmark,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    bg: "border-slate-200 hover:border-slate-300",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Bank statements, electronic transfers, deposits, and account reconciliations.",
  },
  Cash: {
    icon: Wallet,
    color: "text-amber-800 bg-amber-50 border-amber-200",
    bg: "border-slate-200 hover:border-slate-300",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    description: "Petty cash expenses, cash register till balance, and direct retail vouchers.",
  },
};

export function JournalsPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<Journal | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await listJournals();
      setJournals(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleArchive(id: string) {
    if (confirm("Are you sure you want to archive this journal?")) {
      await archiveJournal(id);
      load();
    }
  }

  function openCreateForm() {
    setEditingJournal(undefined);
    setFormOpen(true);
  }

  function openEditForm(journal: Journal) {
    setEditingJournal(journal);
    setFormOpen(true);
  }

  const filteredJournals = journals.filter((j) =>
    j.name.toLowerCase().includes(search.toLowerCase()) ||
    j.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <SearchBar onSearch={setSearch} placeholder="Search journals by name or type — press Enter" />

        {/* View Switcher & Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("grid")}
              className={`h-7 px-2.5 transition-all ${
                view === "grid"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Cards View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("list")}
              className={`h-7 px-2.5 transition-all ${
                view === "list"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Table View"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button onClick={openCreateForm} size="sm" className="h-9 gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle">
            <Plus className="h-3.5 w-3.5" />
            <span>New Journal</span>
          </Button>
        </div>
      </div>

      <JournalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        journal={editingJournal}
        onSaved={load}
      />

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading journals...</div>
      ) : filteredJournals.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-dashed border-slate-200 bg-white shadow-card">
          <Layers className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-900">No journals found</p>
          <p className="text-xs text-slate-500 mt-1">Create transaction books (Sales, Purchase, Bank, Cash) to start posting financial ledger entries.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {filteredJournals.map((journal) => {
            const theme = JOURNAL_THEMES[journal.type] ?? JOURNAL_THEMES.Sales;
            const Icon = theme.icon;
            return (
              <div
                key={journal.id}
                className={`flex flex-col justify-between rounded-lg border bg-white p-5 shadow-card hover:shadow-card-hover transition-all duration-200 ${theme.bg}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`h-9 w-9 rounded-md flex items-center justify-center border ${theme.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase font-mono font-semibold ${theme.badge}`}>
                      {journal.type}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-sm text-slate-900 mt-3 font-display">{journal.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {theme.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">ID: {journal.id.slice(-6)}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditForm(journal)} className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-100">
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleArchive(journal.id)} className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50">
                      <Archive className="h-3 w-3 mr-1" /> Archive
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-card">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200">
                <TableHead className="text-xs font-semibold text-slate-700">Journal Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Book Type</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Purpose & Transaction Scope</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJournals.map((journal) => {
                const theme = JOURNAL_THEMES[journal.type] ?? JOURNAL_THEMES.Sales;
                return (
                  <TableRow key={journal.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-xs text-slate-900 flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-slate-500" />
                      <span>{journal.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-mono font-semibold ${theme.badge}`}>
                        {journal.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {theme.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditForm(journal)} className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-100">
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleArchive(journal.id)} className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50">
                          <Archive className="h-3 w-3 mr-1" /> Archive
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

