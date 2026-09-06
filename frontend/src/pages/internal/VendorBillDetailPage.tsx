import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordPaymentDialog } from "@/components/purchases/RecordPaymentDialog";
import {
  getVendorBill,
  type Payment,
  type VendorBill,
  type VendorBillLine,
} from "@/lib/api/vendor-bills";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
// Bills/invoices reuse the DocumentStatus enum, but the wireframe labels the unpaid state "Not Paid".
const payLabel = (s: string) => (s === "Draft" ? "Not Paid" : s);

type VendorBillDetail = VendorBill & {
  payments: Payment[];
  lines: (VendorBillLine & { product?: { name: string } })[];
};

export function VendorBillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<VendorBillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  function load() {
    if (!id) return;
    getVendorBill(id).then((data) => {
      setBill(data as VendorBillDetail);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200 shadow-card max-w-4xl">
        <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mb-3"></div>
        <p>Loading bill details...</p>
      </div>
    );
  }
  if (!bill) {
    return (
      <div className="p-8 text-center rounded-lg border border-rose-200 bg-rose-50/50 text-rose-700 max-w-4xl">
        <p className="text-sm font-semibold">Vendor Bill Not Found</p>
        <p className="text-xs mt-1">The requested bill could not be located or may have been removed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payables</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-mono text-slate-500">#{bill.id.substring(0, 8)}</span>
          </div>
          <h1 className="text-xl font-bold font-display tracking-tight text-slate-900">Vendor Bill Details</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {bill.purchaseOrder && (
            <Button asChild variant="outline" size="sm" className="h-9 border-slate-200 text-xs font-medium">
              <Link to={`/purchase-orders/${bill.purchaseOrder.id}`}>PO {bill.purchaseOrder.refNumber}</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="h-9 border-slate-200 text-xs font-medium">
            <Link to="/reports/budget">Budget</Link>
          </Button>
          {bill.status !== "Paid" && (
            <Button onClick={() => setPaymentDialogOpen(true)} size="sm" className="h-9 px-4 gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle transition-colors">
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Bill Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bill Date</p>
          <p className="text-sm font-semibold text-slate-900 mt-1">{shortDate(bill.date)}</p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Due Date</p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {bill.dueDate ? shortDate(bill.dueDate) : <span className="text-slate-400">—</span>}
          </p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bill Reference</p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {bill.reference ?? <span className="text-slate-400">—</span>}
          </p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Amount</p>
          <p className="text-base font-bold font-display text-slate-900 mt-1 tabular-nums">{inr(bill.amount)}</p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amount Due</p>
          <p className={`text-base font-bold font-display mt-1 tabular-nums ${bill.amountDue > 0 ? "text-rose-600" : "text-emerald-700"}`}>{inr(bill.amountDue)}</p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payment Status</p>
          <div className="mt-1.5">
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                bill.status === "Paid"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : bill.status === "Partial"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {payLabel(bill.status)}
            </Badge>
          </div>
        </div>
      </div>

      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        vendorBillId={bill.id}
        amountDue={bill.amountDue}
        onRecorded={load}
      />

      {bill.lines.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold font-display text-slate-900">Bill Lines</h2>
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
                {bill.lines.map((line) => (
                  <TableRow key={line.id} className="border-slate-100">
                    <TableCell className="px-4 py-3 text-xs text-slate-900">{line.product?.name ?? line.productId}</TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-500">Purchase</TableCell>
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

      <div className="space-y-3">
        <h2 className="text-sm font-bold font-display text-slate-900">Payment History &amp; Settlements</h2>
        {bill.payments.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-dashed border-slate-300 bg-white shadow-card">
            <p className="text-xs text-slate-500">No payments recorded yet for this bill.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-card">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-700 h-10 px-4">Payment Date</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700 h-10 px-4">Amount Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.payments.map((payment) => (
                  <TableRow key={payment.id} className="border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <TableCell className="text-xs text-slate-900 font-medium px-4 py-3">{new Date(payment.date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-emerald-700 tabular-nums px-4 py-3">₹{payment.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
