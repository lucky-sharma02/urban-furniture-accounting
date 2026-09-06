import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordInvoicePaymentDialog } from "@/components/sales/RecordInvoicePaymentDialog";
import {
  getCustomerInvoice,
  type CustomerInvoice,
  type CustomerInvoiceLine,
  type Payment,
} from "@/lib/api/customer-invoices";

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const longDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

type CustomerInvoiceDetail = CustomerInvoice & {
  payments: Payment[];
  lines: (CustomerInvoiceLine & { product?: { name: string } })[];
};

export function CustomerInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<CustomerInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  function load() {
    if (!id) return;
    getCustomerInvoice(id).then((data) => {
      setInvoice(data as CustomerInvoiceDetail);
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
        <p>Loading invoice details...</p>
      </div>
    );
  }
  if (!invoice) {
    return (
      <div className="max-w-4xl rounded-lg border border-rose-200 bg-rose-50/50 p-8 text-center text-rose-700">
        <p className="text-sm font-semibold">Customer Invoice Not Found</p>
        <p className="mt-1 text-xs">The requested invoice could not be located or may have been removed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Receivables</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="font-mono text-xs text-slate-500">{invoice.refNumber}</span>
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">Customer Invoice Details</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {invoice.salesOrder && (
            <Button asChild variant="outline" size="sm" className="h-9 border-slate-200 text-xs font-medium">
              <Link to={`/sales-orders/${invoice.salesOrder.id}`}>SO {invoice.salesOrder.refNumber}</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="h-9 border-slate-200 text-xs font-medium">
            <Link to="/reports/budget">Budget</Link>
          </Button>
          {invoice.status !== "Paid" && (
            <Button
              onClick={() => setPaymentDialogOpen(true)}
              size="sm"
              className="h-9 gap-1.5 bg-slate-900 px-4 text-xs font-semibold text-white shadow-subtle transition-colors hover:bg-slate-800"
            >
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Invoice Date", value: longDate(invoice.date) },
          { label: "Base Amount", value: inr(invoice.baseAmount) },
          { label: "GST (18%)", value: inr(invoice.taxAmount) },
          { label: "Invoice Total", value: inr(invoice.amount), accent: "text-slate-900" },
          {
            label: "Amount Due",
            value: inr(invoice.amountDue),
            accent: invoice.amountDue > 0 ? "text-rose-600" : "text-emerald-700",
          },
        ].map((cell) => (
          <div key={cell.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{cell.label}</p>
            <p className={`mt-1 font-display text-sm font-bold tabular-nums ${cell.accent ?? "text-slate-900"}`}>
              {cell.value}
            </p>
          </div>
        ))}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</p>
          <div className="mt-1.5">
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
          </div>
        </div>
      </div>

      {invoice.lines.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-sm font-bold text-slate-900">Invoice Lines</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Product</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Chart of Account</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Budget Analytics</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Qty</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Unit Price</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Line Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines.map((line) => (
                  <TableRow key={line.id} className="border-slate-100">
                    <TableCell className="px-4 py-3 text-xs text-slate-900">{line.product?.name ?? line.productId}</TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-500">Sales</TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-600">
                      {line.analyticAccount?.name ?? <span className="text-slate-400">—</span>}
                    </TableCell>
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
      )}

      <RecordInvoicePaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoiceId={invoice.id}
        amountDue={invoice.amountDue}
        onRecorded={load}
      />

      <div className="space-y-3">
        <h2 className="font-display text-sm font-bold text-slate-900">Payment History &amp; Settlements</h2>
        {invoice.payments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-card">
            <p className="text-xs text-slate-500">No payments recorded yet for this invoice.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Receipt</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Payment Date</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Deposited To</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Amount Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id} className="border-slate-100 transition-colors hover:bg-slate-50">
                    <TableCell className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{payment.refNumber}</TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-600">{longDate(payment.date)}</TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-600">
                      {payment.paymentAccount?.name ?? payment.paymentAccountId}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-xs font-bold tabular-nums text-emerald-700">
                      {inr(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
