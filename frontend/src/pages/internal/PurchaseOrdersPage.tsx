import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PurchaseOrderFormDialog } from "@/components/purchases/PurchaseOrderFormDialog";
import { convertPurchaseOrderToBill, listPurchaseOrders, type PurchaseOrder } from "@/lib/api/purchase-orders";

interface PurchaseOrderWithVendor extends PurchaseOrder {
  vendor?: { name: string };
}

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await listPurchaseOrders();
    setPurchaseOrders(data as PurchaseOrderWithVendor[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function total(po: PurchaseOrder) {
    return po.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  }

  async function handleConvert(poId: string) {
    setConverting(poId);
    try {
      const bill = await convertPurchaseOrderToBill(poId);
      navigate(`/vendor-bills/${bill.id}`);
    } finally {
      setConverting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">Purchase Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage supplier procurement orders, track status & convert to vendor bills.</p>
        </div>
        <Button onClick={() => setFormOpen(true)} size="sm" className="h-9 gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle">
          New Purchase Order
        </Button>
      </div>

      <PurchaseOrderFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading purchase orders...</div>
      ) : purchaseOrders.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-dashed border-slate-200 bg-white shadow-card">
          <p className="text-sm font-semibold text-slate-900">No purchase orders found</p>
          <p className="text-xs text-slate-500 mt-1">Create your first procurement order with a registered supplier vendor.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-card">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200">
                <TableHead className="text-xs font-semibold text-slate-700">Vendor Entity</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Order Date</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Total Order Amount</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Order Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((po) => (
                <TableRow key={po.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-xs text-slate-900">{po.vendor?.name ?? po.vendorId}</TableCell>
                  <TableCell className="text-xs text-slate-600 font-mono">{new Date(po.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right text-xs font-semibold text-slate-900 tabular-nums">₹{total(po).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium ${
                        po.status === "Billed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {po.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {po.status === "Draft" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={converting === po.id}
                        onClick={() => handleConvert(po.id)}
                        className="h-7 px-2 text-xs text-slate-900 font-medium hover:bg-slate-100"
                      >
                        {converting === po.id ? "Converting..." : "Convert to Bill →"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
