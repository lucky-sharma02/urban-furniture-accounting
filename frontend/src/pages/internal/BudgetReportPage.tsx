import { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BudgetFormDialog } from "@/components/reports/BudgetFormDialog";
import { downloadBudgetReportPdf, getBudgetReport, type BudgetRow } from "@/lib/api/reports";

const COLORS = { achieved: "#2563eb", balance: "#d1d5db" };

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Budget Report</h1>
        <div className="flex gap-2">
          <Button variant="outline" disabled={exporting} onClick={handleExport}>
            {exporting ? "Exporting..." : "Export PDF"}
          </Button>
          <Button onClick={() => setFormOpen(true)}>New Budget</Button>
        </div>
      </div>

      <BudgetFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">No budgets yet.</p>
      ) : (
        <div className="flex flex-col gap-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Analytic Account</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Planned</TableHead>
                <TableHead>Achieved</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.analyticAccountName}</TableCell>
                  <TableCell>
                    {new Date(row.periodStart).toLocaleDateString()} –{" "}
                    {new Date(row.periodEnd).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{row.plannedAmount.toFixed(2)}</TableCell>
                  <TableCell>{row.actualAmount.toFixed(2)}</TableCell>
                  <TableCell>{row.remainingAmount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((row) => {
              const achieved = Math.max(0, row.actualAmount);
              const balance = Math.max(0, row.remainingAmount);
              const data = [
                { name: "Achieved", value: achieved },
                { name: "Balance", value: balance },
              ];
              return (
                <div key={row.id} className="flex flex-col items-center">
                  <p className="mb-1 text-center text-sm font-medium">{row.analyticAccountName}</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60}>
                        <Cell fill={COLORS.achieved} />
                        <Cell fill={COLORS.balance} />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
