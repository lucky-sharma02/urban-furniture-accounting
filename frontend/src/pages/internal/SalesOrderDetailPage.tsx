import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalesOrderFormDialog } from "@/components/sales/SalesOrderFormDialog";
import {
  generateInvoiceFromSalesOrder,
  getSalesOrder,
  type SalesOrder,
  type SalesOrderLine,
} from "@/lib/api/sales-orders";
import type { CustomerInvoice } from "@/lib/api/customer-invoices";
import { Pencil, ArrowRight } from "lucide-react";

interface SalesOrderDetail extends SalesOrder {
  customer?: { name: string };
  analyticAccount?: { id: string; name: string } | null;
  lines: (SalesOrderLine & { product?: { name: string } })[];
  invoices: CustomerInvoice[];
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const longDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

export function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [so, setSo] = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ invoiceId: string; warnings: string[] } | null>(null);

  function load() {
    if (!id) return;
    getSalesOrder(id).then((data) => {
      setSo(data as SalesOrderDetail);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl rounded-lg border border-slate-200 bg-white py-16 text-center text-xs text-slate-500 shadow-card">
        <div className="mb-3 inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        <p>Loading sales order...</p>
      </div>
    );
  }
  if (!so) {
    return (
      <div className="max-w-4xl rounded-lg border border-rose-200 bg-rose-50/50 p-8 text-center text-rose-700">
        <p className="text-sm font-semibold">Sales Order Not Found</p>
      </div>
    );
  }

  const total = so.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  async function handleGenerateInvoice() {
    setGenerating(true);
    try {
      const invoice = await generateInvoiceFromSalesOrder(so!.id);
      const warnings = invoice.budgetWarnings ?? [];
      if (warnings.length > 0) {
        setGenerated({ invoiceId: invoice.id, warnings });
      } else {
        navigate(`/customer-invoices/${invoice.id}`);
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sales</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="font-mono text-xs text-slate-500">{so.refNumber}</span>
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
            {so.customer?.name ?? so.customerId}
          </h1>
        </div>
        {so.status === "Draft" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="h-9 gap-1.5 border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              disabled={generating}
              onClick={handleGenerateInvoice}
              className="h-9 gap-1.5 bg-slate-900 px-4 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
            >
              {generating ? "Generating..." : "Generate Invoice"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <SalesOrderFormDialog open={editOpen} onOpenChange={setEditOpen} onSaved={load} editingOrder={so} />

      {generated && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 shadow-card">
          <p className="mb-1 font-semibold">Invoice generated — budget notice</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {generated.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <Button
            size="sm"
            className="mt-3 h-8 bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
            onClick={() => navigate(`/customer-invoices/${generated.invoiceId}`)}
          >
            View Invoice
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Order Date</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{longDate(so.date)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Net Total (ex-GST)</p>
          <p className="mt-1 font-display text-base font-bold tabular-nums text-slate-900">{inr(total)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Budget Analytics</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {so.analyticAccount?.name ?? <span className="text-slate-400">Not tagged</span>}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</p>
          <div className="mt-1.5">
            <Badge
              variant="outline"
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                so.status === "Invoiced"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {so.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-sm font-bold text-slate-900">Order Lines</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Product</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Qty</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Unit Price</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Line Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {so.lines.map((line) => (
                <TableRow key={line.id} className="border-slate-100">
                  <TableCell className="px-4 py-3 text-xs text-slate-900">{line.product?.name ?? line.productId}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs tabular-nums text-slate-600">{line.quantity}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs tabular-nums text-slate-600">{inr(line.unitPrice)}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-slate-900">
                    {inr(line.quantity * line.unitPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {so.invoices.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-sm font-bold text-slate-900">Generated Invoices</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Invoice</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Total</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Amount Due</TableHead>
                  <TableHead className="h-10 px-4 text-center text-xs font-semibold text-slate-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {so.invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer border-slate-100 transition-colors hover:bg-slate-50"
                    onClick={() => navigate(`/customer-invoices/${invoice.id}`)}
                  >
                    <TableCell className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{invoice.refNumber}</TableCell>
                    <TableCell className="px-4 py-3 text-right text-xs tabular-nums text-slate-900">{inr(invoice.amount)}</TableCell>
                    <TableCell className="px-4 py-3 text-right text-xs tabular-nums text-rose-600">{inr(invoice.amountDue)}</TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          invoice.status === "Paid"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : invoice.status === "Partial"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {invoice.status}
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
