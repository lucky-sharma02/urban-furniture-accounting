import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { downloadProfitAndLossPdf, getProfitAndLoss, type ProfitAndLoss } from "@/lib/api/reports";
import { Download, TrendingUp, TrendingDown } from "lucide-react";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function startOfYear() {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
}

export function ProfitAndLossPage() {
  const [from, setFrom] = useState(startOfYear);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<ProfitAndLoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  function load() {
    setLoading(true);
    getProfitAndLoss(from, to).then((data) => {
      setReport(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadProfitAndLossPdf(from, to);
    } finally {
      setExporting(false);
    }
  }

  const net = report?.totals.netIncome ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-44 border-slate-200 bg-white text-xs shadow-2xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-44 border-slate-200 bg-white text-xs shadow-2xs"
            />
          </div>
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

      {loading || !report ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading profit &amp; loss...</div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-display text-sm font-bold text-slate-900">Income</h2>
              </div>
              <Table>
                <TableBody>
                  {report.income.map((a) => (
                    <TableRow key={a.accountId} className="border-slate-100">
                      <TableCell className="px-4 py-2.5 text-xs text-slate-700">{a.accountName}</TableCell>
                      <TableCell className="px-4 py-2.5 text-right text-xs tabular-nums text-slate-900">{inr(a.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-slate-50">
                  <TableRow className="border-slate-200">
                    <TableCell className="px-4 py-3 text-xs font-bold text-slate-900">Total Income</TableCell>
                    <TableCell className="px-4 py-3 text-right text-xs font-bold tabular-nums text-emerald-700">
                      {inr(report.totals.income)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700">
                  <TrendingDown className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-display text-sm font-bold text-slate-900">Expenses</h2>
              </div>
              <Table>
                <TableBody>
                  {report.expenses.map((a) => (
                    <TableRow key={a.accountId} className="border-slate-100">
                      <TableCell className="px-4 py-2.5 text-xs text-slate-700">{a.accountName}</TableCell>
                      <TableCell className="px-4 py-2.5 text-right text-xs tabular-nums text-slate-900">{inr(a.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-slate-50">
                  <TableRow className="border-slate-200">
                    <TableCell className="px-4 py-3 text-xs font-bold text-slate-900">Total Expenses</TableCell>
                    <TableCell className="px-4 py-3 text-right text-xs font-bold tabular-nums text-rose-700">
                      {inr(report.totals.expenses)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-card">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Net Income for Period</p>
              <p className="mt-0.5 text-xs text-slate-500">Income less expenses over the selected date range</p>
            </div>
            <p
              className={`font-display text-2xl font-bold tabular-nums ${
                net >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {inr(net)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
