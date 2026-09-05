import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadBalanceSheetPdf, getBalanceSheet, type BalanceSheet } from "@/lib/api/reports";
import { Download, Landmark, Scale } from "lucide-react";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BalanceSheetPage() {
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  function load() {
    setLoading(true);
    getBalanceSheet(asOf).then((data) => {
      setReport(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOf]);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadBalanceSheetPdf(asOf);
    } finally {
      setExporting(false);
    }
  }

  const balanced =
    report && Math.abs(report.totals.assets - report.totals.liabilitiesAndCapital) < 0.005;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="as-of" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Position as of
          </Label>
          <Input
            id="as-of"
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="h-9 w-48 border-slate-200 bg-white text-xs shadow-2xs"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={handleExport}
          className="h-9 gap-1.5 border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Exporting..." : "Export PDF"}
        </Button>
      </div>

      {report && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 text-xs font-medium ${
            balanced
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <Scale className="h-4 w-4" />
          {balanced
            ? `Accounting equation holds — Assets ${inr(report.totals.assets)} = Liabilities + Capital ${inr(report.totals.liabilitiesAndCapital)}`
            : `Out of balance — Assets ${inr(report.totals.assets)} vs Liabilities + Capital ${inr(report.totals.liabilitiesAndCapital)}`}
        </div>
      )}

      {loading || !report ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading balance sheet...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                <Landmark className="h-3.5 w-3.5" />
              </div>
              <h2 className="font-display text-sm font-bold text-slate-900">Assets</h2>
            </div>
            <Table>
              <TableBody>
                {report.assets.map((a) => (
                  <TableRow key={a.accountId} className="border-slate-100">
                    <TableCell className="px-4 py-2.5 text-xs text-slate-700">{a.accountName}</TableCell>
                    <TableCell className="px-4 py-2.5 text-right text-xs tabular-nums text-slate-900">{inr(a.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-slate-50">
                <TableRow className="border-slate-200">
                  <TableCell className="px-4 py-3 text-xs font-bold text-slate-900">Total Assets</TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs font-bold tabular-nums text-slate-900">
                    {inr(report.totals.assets)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700">
                <Landmark className="h-3.5 w-3.5" />
              </div>
              <h2 className="font-display text-sm font-bold text-slate-900">Liabilities &amp; Capital</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Liabilities
                  </TableHead>
                  <TableHead className="px-4 py-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.liabilities.map((a) => (
                  <TableRow key={a.accountId} className="border-slate-100">
                    <TableCell className="px-4 py-2.5 text-xs text-slate-700">{a.accountName}</TableCell>
                    <TableCell className="px-4 py-2.5 text-right text-xs tabular-nums text-slate-900">{inr(a.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Capital
                  </TableHead>
                  <TableHead className="px-4 py-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.capital.map((a) => (
                  <TableRow key={a.accountId} className="border-slate-100">
                    <TableCell className="px-4 py-2.5 text-xs text-slate-700">{a.accountName}</TableCell>
                    <TableCell className="px-4 py-2.5 text-right text-xs tabular-nums text-slate-900">{inr(a.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-slate-100">
                  <TableCell className="px-4 py-2.5 text-xs italic text-slate-600">Net Income (to date)</TableCell>
                  <TableCell className="px-4 py-2.5 text-right text-xs tabular-nums text-slate-900">{inr(report.netIncome)}</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter className="bg-slate-50">
                <TableRow className="border-slate-200">
                  <TableCell className="px-4 py-3 text-xs font-bold text-slate-900">Total Liabilities + Capital</TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs font-bold tabular-nums text-slate-900">
                    {inr(report.totals.liabilitiesAndCapital)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
