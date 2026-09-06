import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BudgetFormDialog } from "@/components/reports/BudgetFormDialog";
import {
  cancelBudget,
  confirmBudget,
  reviseBudget,
} from "@/lib/api/analytic-accounts";
import { downloadBudgetReportPdf, getBudgetReport, type BudgetReport } from "@/lib/api/reports";
import { Download, Plus, PieChart as PieChartIcon, Target, TrendingUp, Wallet } from "lucide-react";

const BALANCE = "#e2e8f0"; // slate-200
const ON_TRACK = "#059669"; // emerald-600
const OVER = "#e11d48"; // rose-600

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortMonth = (d: string) => new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

const STATUS_STYLES: Record<string, string> = {
  Draft: "border-slate-200 bg-slate-100 text-slate-600",
  Confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Revised: "border-amber-200 bg-amber-50 text-amber-700",
  Cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

export function BudgetReportPage() {
  const [budgets, setBudgets] = useState<BudgetReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetReport | null>(null);
  const [exporting, setExporting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getBudgetReport().then((data) => {
      setBudgets(data);
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

  async function runAction(id: string, action: (id: string) => Promise<unknown>) {
    setBusyId(id);
    try {
      await action(id);
      load();
    } finally {
      setBusyId(null);
    }
  }

  // Only Confirmed / Revised budgets have meaningful "achieved" numbers.
  const trackedLines = useMemo(
    () =>
      budgets
        .filter((b) => b.status === "Confirmed" || b.status === "Revised")
        .flatMap((b) => b.lines.map((l) => ({ ...l, budgetName: b.name }))),
    [budgets],
  );

  const totals = useMemo(() => {
    const committed = trackedLines.reduce((s, l) => s + l.committedAmount, 0);
    const achieved = trackedLines.reduce((s, l) => s + l.achievedAmount, 0);
    return {
      committed,
      achieved,
      amountToAchieve: committed - achieved,
      pct: committed > 0 ? (achieved / committed) * 100 : 0,
      overCount: trackedLines.filter((l) => l.achievedAmount > l.committedAmount).length,
    };
  }, [trackedLines]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={exporting || budgets.length === 0}
          onClick={handleExport}
          className="h-9 gap-1.5 border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Exporting..." : "Export PDF"}
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          size="sm"
          className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          New Budget
        </Button>
      </div>

      <BudgetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={load}
        editingBudget={editing}
      />

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading budget report...</div>
      ) : budgets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center shadow-card">
          <PieChartIcon className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">No budgets yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Create a budget, add analytic lines (Income / Expenses), then confirm it to start tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {trackedLines.length > 0 && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={Target} label="Total Committed" value={inr(totals.committed)} tone="slate" />
              <StatCard icon={Wallet} label="Total Achieved" value={inr(totals.achieved)} tone="emerald" />
              <StatCard
                icon={TrendingUp}
                label="Amount to Achieve"
                value={inr(totals.amountToAchieve)}
                tone={totals.amountToAchieve < 0 ? "rose" : "slate"}
              />
              <StatCard
                icon={PieChartIcon}
                label="Achieved %"
                value={`${totals.pct.toFixed(1)}%`}
                tone={totals.pct > 100 ? "rose" : "emerald"}
                hint={totals.overCount > 0 ? `${totals.overCount} line(s) over` : "all within budget"}
              />
            </div>
          )}

          {budgets.map((budget) => {
            const tracked = budget.status === "Confirmed" || budget.status === "Revised";
            return (
            <div key={budget.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {tracked && (
                    <BudgetDonut
                      achieved={budget.totals.achieved}
                      committed={budget.totals.committed}
                    />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-sm font-bold text-slate-900">{budget.name}</h3>
                      <Badge
                        variant="outline"
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[budget.status] ?? ""}`}
                      >
                        {budget.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                      {shortMonth(budget.periodStart)} – {shortMonth(budget.periodEnd)}
                      {budget.responsibleName ? ` · ${budget.responsibleName}` : ""}
                    </p>
                    {budget.revisedFromName && (
                      <p className="mt-0.5 text-[11px] text-amber-700">
                        Revision of “{budget.revisedFromName}”
                      </p>
                    )}
                    {budget.status === "Revised" && (
                      <p className="mt-0.5 text-[11px] text-slate-400">Superseded by a newer revision</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {budget.status === "Draft" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-slate-200 text-xs font-medium"
                        onClick={() => {
                          setEditing(budget);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        disabled={busyId === budget.id}
                        className="h-8 bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                        onClick={() => runAction(budget.id, confirmBudget)}
                      >
                        Confirm
                      </Button>
                    </>
                  )}
                  {budget.status === "Confirmed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === budget.id}
                      className="h-8 border-slate-200 text-xs font-medium"
                      onClick={() => runAction(budget.id, reviseBudget)}
                    >
                      Revise
                    </Button>
                  )}
                  {budget.status !== "Cancelled" && budget.status !== "Revised" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === budget.id}
                      className="h-8 px-3 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      onClick={() => runAction(budget.id, cancelBudget)}
                    >
                      {budget.revisedFromName ? "Discard Revision" : "Cancel"}
                    </Button>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Analytic</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Type</TableHead>
                    <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Committed</TableHead>
                    <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Achieved</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Achieved %</TableHead>
                    <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">To Achieve</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budget.lines.map((line) => {
                    const over = line.achievedAmount > line.committedAmount;
                    return (
                      <TableRow key={line.id} className="border-slate-100">
                        <TableCell className="px-4 py-3 text-xs font-medium text-slate-900">
                          {line.analyticAccountName}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                              line.type === "Income"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {line.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-xs tabular-nums text-slate-900">
                          {inr(line.committedAmount)}
                        </TableCell>
                        <TableCell
                          className={`px-4 py-3 text-right text-xs font-semibold tabular-nums ${
                            !tracked ? "text-slate-400" : over ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {tracked ? inr(line.achievedAmount) : "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {tracked ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full ${over ? "bg-rose-500" : "bg-emerald-500"}`}
                                  style={{ width: `${Math.min(100, line.achievedPct)}%` }}
                                />
                              </div>
                              <span
                                className={`text-[11px] font-medium tabular-nums ${over ? "text-rose-600" : "text-slate-500"}`}
                              >
                                {line.achievedPct.toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">not tracked</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`px-4 py-3 text-right text-xs tabular-nums ${
                            line.amountToAchieve < 0 ? "text-rose-600" : "text-slate-900"
                          }`}
                        >
                          {inr(line.amountToAchieve)}
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
                    <TableCell className="px-4 py-3 text-right text-xs font-bold tabular-nums text-slate-900">
                      {inr(budget.totals.committed)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-xs font-bold tabular-nums text-slate-900">
                      {tracked ? inr(budget.totals.achieved) : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3" />
                    <TableCell
                      className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${
                        budget.totals.amountToAchieve < 0 ? "text-rose-600" : "text-slate-900"
                      }`}
                    >
                      {inr(budget.totals.amountToAchieve)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Achieved vs Balance donut, matching the wireframe's per-budget pie.
function BudgetDonut({ achieved, committed }: { achieved: number; committed: number }) {
  const over = achieved > committed;
  const balance = Math.max(committed - achieved, 0);
  const data = over
    ? [{ name: "Achieved", value: achieved }]
    : [
        { name: "Achieved", value: achieved },
        { name: "Balance", value: balance },
      ];
  const pct = committed > 0 ? Math.round((achieved / committed) * 100) : 0;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={20}
            outerRadius={30}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={over ? OVER : ON_TRACK} />
            {!over && <Cell fill={BALANCE} />}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
            formatter={(v, n) => [`₹${(Number(v) || 0).toLocaleString("en-IN")}`, String(n)]}
          />
        </PieChart>
      </ResponsiveContainer>
      <span
        className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums ${
          over ? "text-rose-600" : "text-slate-700"
        }`}
      >
        {pct}%
      </span>
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
