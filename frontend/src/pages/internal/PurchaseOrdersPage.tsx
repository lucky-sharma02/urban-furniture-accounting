import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SearchBar } from "@/components/ui/search-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePaginated } from "@/hooks/use-paginated";
import { PurchaseOrderFormDialog } from "@/components/purchases/PurchaseOrderFormDialog";
import { convertPurchaseOrderToBill, listPurchaseOrders, type PurchaseOrder } from "@/lib/api/purchase-orders";
import { Plus, ShoppingCart, ArrowRight } from "lucide-react";

interface PurchaseOrderWithVendor extends PurchaseOrder {
  vendor?: { name: string };
}

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return purchaseOrders;
    return purchaseOrders.filter(
      (po) =>
        po.refNumber.toLowerCase().includes(q) ||
        (po.vendor?.name ?? "").toLowerCase().includes(q) ||
        po.status.toLowerCase().includes(q),
    );
  }, [purchaseOrders, search]);

  const pag = usePaginated(filtered, 25, search);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar onSearch={setSearch} placeholder="Search by ref, vendor, or status — press Enter" />
        <Button
          onClick={() => setFormOpen(true)}
          size="sm"
          className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          New Purchase Order
        </Button>
      </div>

      <PurchaseOrderFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading purchase orders...</div>
      ) : pag.total === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center shadow-card">
          <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">No purchase orders found</p>
          <p className="mt-1 text-xs text-slate-500">
            Create a procurement order with a registered supplier — it stays editable until you convert it to a bill.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Reference</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Vendor Entity</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Order Date</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Total Order Amount</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Order Status</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pag.pageItems.map((po) => (
                <TableRow
                  key={po.id}
                  className="cursor-pointer border-slate-100 transition-colors hover:bg-slate-50"
                  onClick={() => navigate(`/purchase-orders/${po.id}`)}
                >
                  <TableCell className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{po.refNumber}</TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-900">{po.vendor?.name ?? po.vendorId}</TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs text-slate-600">
                    {new Date(po.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-slate-900">
                    ₹{total(po).toFixed(2)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium ${
                        po.status === "Billed"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : po.status === "Confirmed"
                            ? "border-sky-200 bg-sky-50 text-sky-700"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {po.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {po.status === "Confirmed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={converting === po.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConvert(po.id);
                        }}
                        className="h-7 gap-1 px-2 text-xs font-medium text-slate-900 hover:bg-slate-100"
                      >
                        {converting === po.id ? "Converting..." : "Create Bill"}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pag.totalPages > 1 && (
            <div className="border-t border-slate-100 px-4 py-3">
              <Pagination pagination={pag} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
