import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { downloadProfitAndLossPdf, getProfitAndLoss, type ProfitAndLoss } from "@/lib/api/reports";

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profit &amp; Loss</h1>
        <Button variant="outline" disabled={exporting} onClick={handleExport}>
          {exporting ? "Exporting..." : "Export PDF"}
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {loading || !report ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 text-lg font-medium">Income</h2>
            <Table>
              <TableBody>
                {report.income.map((a) => (
                  <TableRow key={a.accountId}>
                    <TableCell>{a.accountName}</TableCell>
                    <TableCell className="text-right">{a.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total Income</TableCell>
                  <TableCell className="text-right font-medium">{report.totals.income.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-medium">Expenses</h2>
            <Table>
              <TableBody>
                {report.expenses.map((a) => (
                  <TableRow key={a.accountId}>
                    <TableCell>{a.accountName}</TableCell>
                    <TableCell className="text-right">{a.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total Expenses</TableCell>
                  <TableCell className="text-right font-medium">{report.totals.expenses.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      )}

      {report && (
        <p className="text-lg font-semibold">Net Income: {report.totals.netIncome.toFixed(2)}</p>
      )}
    </div>
  );
}
