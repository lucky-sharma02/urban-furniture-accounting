import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listJournalEntries, type JournalEntryListRow } from "@/lib/api/journal-entries";
import { FileSpreadsheet, Plus } from "lucide-react";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

export function JournalEntriesPage() {
  const [params] = useSearchParams();
  const journalId = params.get("journalId") ?? undefined;
  const [rows, setRows] = useState<JournalEntryListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    listJournalEntries(journalId).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [journalId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.refNumber.toLowerCase().includes(q) ||
        r.journalName.toLowerCase().includes(q) ||
        (r.partner ?? "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const journalName = rows[0]?.journalName;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          onSearch={setSearch}
          placeholder="Search by number, journal, partner, or status — press Enter"
          className="sm:max-w-md"
        />
        <Button
          asChild
          size="sm"
          className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
        >
          <Link to="/post-entry">
            <Plus className="h-3.5 w-3.5" />
            Post Entry
          </Link>
        </Button>
      </div>

      {journalId && journalName && (
        <p className="text-xs text-slate-500">
          Filtered to <span className="font-semibold text-slate-700">{journalName}</span> ·{" "}
          <Link to="/journal-entries" className="text-slate-900 underline">
            show all
          </Link>
        </p>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading journal entries...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center shadow-card">
          <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">No journal entries</p>
          <p className="mt-1 text-xs text-slate-500">
            Entries are posted automatically by confirmed bills and invoices, or manually from the Post
            Entry screen.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Date</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Number</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Partner</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Journal</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Total</TableHead>
                  <TableHead className="h-10 px-4 text-center text-xs font-semibold text-slate-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id} className="border-slate-100">
                    <TableCell className="px-4 py-3 text-xs text-slate-600">{shortDate(row.date)}</TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs font-medium text-slate-900">
                      {row.refNumber}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-600">
                      {row.partner ?? <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-600">{row.journalName}</TableCell>
                    <TableCell className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-slate-900">
                      {inr(row.total)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          row.status === "Posted"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
