import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BudgetFormDialog } from "@/components/reports/BudgetFormDialog";
import { downloadBudgetReportPdf, getBudgetReport, type BudgetRow } from "@/lib/api/reports";
import { Download, Plus, PieChart as PieChartIcon, TrendingUp, Wallet, Target } from "lucide-react";

const PLANNED = "#94a3b8"; // slate-400
const ON_TRACK = "#059669"; // emerald-600
const OVER = "#e11d48"; // rose-600

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inrShort = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const shortMonth = (d: string) => new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export function BudgetReportPage() {
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  function load() {
    setLoading(true);
    getBudgetReport().then((data) => {
      setRows(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadBudgetReportPdf();
    } finally {
      setExporting(false);
    }
  }

  const totals = useMemo(() => {
    const planned = rows.reduce((s, r) => s + r.plannedAmount, 0);
    const actual = rows.reduce((s, r) => s + r.actualAmount, 0);
    return {
      planned,
      actual,
      remaining: planned - actual,
      utilization: planned > 0 ? (actual / planned) * 100 : 0,
      overCount: rows.filter((r) => r.actualAmount > r.plannedAmount).length,
    };
  }, [rows]);

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        name: r.analyticAccountName,
        Planned: Math.round(r.plannedAmount),
        Actual: Math.round(r.actualAmount),
        over: r.actualAmount > r.plannedAmount,
      })),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={exporting || rows.length === 0}
          onClick={handleExport}
          className="h-9 gap-1.5 border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Exporting..." : "Export PDF"}
        </Button>
        <Button
          onClick={() => setFormOpen(true)}
          size="sm"
          className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          New Budget
        </Button>
      </div>

      <BudgetFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading budget report...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center shadow-card">
          <PieChartIcon className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">No budgets yet</p>
          <p className="mt-1 text-xs text-slate-500">Define a planned amount against an analytic account to track spend.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Target} label="Total Planned" value={inr(totals.planned)} tone="slate" />
            <StatCard icon={Wallet} label="Actual Spend" value={inr(totals.actual)} tone="emerald" />
            <StatCard
              icon={TrendingUp}
              label="Remaining"
              value={inr(totals.remaining)}
              tone={totals.remaining < 0 ? "rose" : "slate"}
            />
            <StatCard
              icon={PieChartIcon}
              label="Utilization"
              value={`${totals.utilization.toFixed(1)}%`}
              tone={totals.utilization > 100 ? "rose" : "emerald"}
              hint={totals.overCount > 0 ? `${totals.overCount} over budget` : "all within budget"}
            />
          </div>

          {/* Planned vs Actual chart */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 font-display text-sm font-bold text-slate-900">Planned vs Actual by Analytic Account</h2>
            <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 56)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 16 }}
                barGap={4}
              >
                <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => inrShort(Number(v) || 0)}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  stroke="#cbd5e1"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 11, fill: "#334155" }}
                  stroke="#cbd5e1"
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(v) => inr(Number(v) || 0)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Planned" fill={PLANNED} radius={[0, 3, 3, 0]} />
                <Bar dataKey="Actual" fill={ON_TRACK} radius={[0, 3, 3, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.over ? OVER : ON_TRACK} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Analytic Account</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Period</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Planned</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Actual</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Remaining</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const pct = row.plannedAmount > 0 ? (row.actualAmount / row.plannedAmount) * 100 : 0;
                  const over = row.actualAmount > row.plannedAmount;
                  return (
                    <TableRow key={row.id} className="border-slate-100 transition-colors hover:bg-slate-50">
                      <TableCell className="px-4 py-3 text-xs font-medium text-slate-900">{row.analyticAccountName}</TableCell>
                      <TableCell className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {shortMonth(row.periodStart)} – {shortMonth(row.periodEnd)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-xs tabular-nums text-slate-900">{inr(row.plannedAmount)}</TableCell>
                      <TableCell
                        className={`px-4 py-3 text-right text-xs font-semibold tabular-nums ${over ? "text-rose-600" : "text-emerald-700"}`}
                      >
                        {inr(row.actualAmount)}
                      </TableCell>
                      <TableCell
                        className={`px-4 py-3 text-right text-xs tabular-nums ${row.remainingAmount < 0 ? "text-rose-600" : "text-slate-900"}`}
                      >
                        {inr(row.remainingAmount)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${over ? "bg-rose-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className={`text-[11px] font-medium tabular-nums ${over ? "text-rose-600" : "text-slate-500"}`}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="bg-slate-50">
                <TableRow className="border-slate-200">
                  <TableCell className="px-4 py-3 text-xs font-bold text-slate-900" colSpan={2}>
                    Total
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs font-bold tabular-nums text-slate-900">{inr(totals.planned)}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs font-bold tabular-nums text-slate-900">{inr(totals.actual)}</TableCell>
                  <TableCell
                    className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${totals.remaining < 0 ? "text-rose-600" : "text-slate-900"}`}
                  >
                    {inr(totals.remaining)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs font-bold tabular-nums text-slate-900">
                    {totals.utilization.toFixed(0)}%
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

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: "slate" | "emerald" | "rose";
  hint?: string;
}) {
  const toneMap = {
    slate: "border-slate-200 bg-slate-100 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  } as const;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-md border ${toneMap[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-2 font-display text-lg font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
