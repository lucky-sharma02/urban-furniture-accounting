import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadBalanceSheetPdf, getBalanceSheet, type BalanceSheet } from "@/lib/api/reports";

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Balance Sheet</h1>
        <Button variant="outline" disabled={exporting} onClick={handleExport}>
          {exporting ? "Exporting..." : "Export PDF"}
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 max-w-xs">
        <Label htmlFor="as-of">As of</Label>
        <Input id="as-of" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </div>

      {loading || !report ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 text-lg font-medium">Assets</h2>
            <Table>
              <TableBody>
                {report.assets.map((a) => (
                  <TableRow key={a.accountId}>
                    <TableCell>{a.accountName}</TableCell>
                    <TableCell className="text-right">{a.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total Assets</TableCell>
                  <TableCell className="text-right font-medium">{report.totals.assets.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-medium">Liabilities & Capital</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Liabilities</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.liabilities.map((a) => (
                  <TableRow key={a.accountId}>
                    <TableCell>{a.accountName}</TableCell>
                    <TableCell className="text-right">{a.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableHeader>
                <TableRow>
                  <TableHead>Capital</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.capital.map((a) => (
                  <TableRow key={a.accountId}>
                    <TableCell>{a.accountName}</TableCell>
                    <TableCell className="text-right">{a.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>Net Income (to date)</TableCell>
                  <TableCell className="text-right">{report.netIncome.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total Liabilities + Capital</TableCell>
                  <TableCell className="text-right font-medium">
                    {report.totals.liabilitiesAndCapital.toFixed(2)}
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
