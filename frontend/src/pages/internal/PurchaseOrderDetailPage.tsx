import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PurchaseOrderFormDialog } from "@/components/purchases/PurchaseOrderFormDialog";
import {
  convertPurchaseOrderToBill,
  getPurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderLine,
} from "@/lib/api/purchase-orders";
import type { VendorBill } from "@/lib/api/vendor-bills";
import { Pencil, ArrowRight } from "lucide-react";

interface PurchaseOrderDetail extends PurchaseOrder {
  vendor?: { name: string };
  lines: (PurchaseOrderLine & {
    product?: { name: string };
    analyticAccount?: { id: string; name: string } | null;
  })[];
  vendorBills: VendorBill[];
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const longDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [po, setPo] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversion, setConversion] = useState<{ billId: string; warnings: string[] } | null>(null);

  function load() {
    if (!id) return;
    getPurchaseOrder(id).then((data) => {
      setPo(data as PurchaseOrderDetail);
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
        <p>Loading purchase order...</p>
      </div>
    );
  }
  if (!po) {
    return (
      <div className="max-w-4xl rounded-lg border border-rose-200 bg-rose-50/50 p-8 text-center text-rose-700">
        <p className="text-sm font-semibold">Purchase Order Not Found</p>
      </div>
    );
  }

  const total = po.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  async function handleConvert() {
    setConverting(true);
    try {
      const bill = await convertPurchaseOrderToBill(po!.id);
      const warnings = bill.budgetWarnings ?? [];
      if (warnings.length > 0) {
        setConversion({ billId: bill.id, warnings });
      } else {
        navigate(`/vendor-bills/${bill.id}`);
      }
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Procurement</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="font-mono text-xs text-slate-500">{po.refNumber}</span>
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
            {po.vendor?.name ?? po.vendorId}
          </h1>
        </div>
        {po.status === "Draft" && (
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
              disabled={converting}
              onClick={handleConvert}
              className="h-9 gap-1.5 bg-slate-900 px-4 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
            >
              {converting ? "Converting..." : "Convert to Bill"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <PurchaseOrderFormDialog open={editOpen} onOpenChange={setEditOpen} onSaved={load} editingOrder={po} />

      {conversion && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 shadow-card">
          <p className="mb-1 font-semibold">Bill created — budget notice</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {conversion.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <Button
            size="sm"
            className="mt-3 h-8 bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
            onClick={() => navigate(`/vendor-bills/${conversion.billId}`)}
          >
            View Bill
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Order Date</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{longDate(po.date)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Order Total</p>
          <p className="mt-1 font-display text-base font-bold tabular-nums text-slate-900">{inr(total)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</p>
          <div className="mt-1.5">
            <Badge
              variant="outline"
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                po.status === "Billed"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {po.status}
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
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Budget Analytics</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Qty</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Unit Price</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Line Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.lines.map((line) => (
                <TableRow key={line.id} className="border-slate-100">
                  <TableCell className="px-4 py-3 text-xs text-slate-900">{line.product?.name ?? line.productId}</TableCell>
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

      {po.vendorBills.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-sm font-bold text-slate-900">Linked Vendor Bills</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Bill</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Amount</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Amount Due</TableHead>
                  <TableHead className="h-10 px-4 text-center text-xs font-semibold text-slate-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.vendorBills.map((bill) => (
                  <TableRow
                    key={bill.id}
                    className="cursor-pointer border-slate-100 transition-colors hover:bg-slate-50"
                    onClick={() => navigate(`/vendor-bills/${bill.id}`)}
                  >
                    <TableCell className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{bill.refNumber}</TableCell>
                    <TableCell className="px-4 py-3 text-right text-xs tabular-nums text-slate-900">{inr(bill.amount)}</TableCell>
                    <TableCell className="px-4 py-3 text-right text-xs tabular-nums text-rose-600">{inr(bill.amountDue)}</TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          bill.status === "Paid"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : bill.status === "Partial"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {bill.status}
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
