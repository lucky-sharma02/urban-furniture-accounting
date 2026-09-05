import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Purchase Orders</h1>
        <Button onClick={() => setFormOpen(true)}>New Purchase Order</Button>
      </div>

      <Input
        placeholder="Search by ref, vendor, or status..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <PurchaseOrderFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No purchase orders found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((po) => (
              <TableRow key={po.id} className="cursor-pointer" onClick={() => navigate(`/purchase-orders/${po.id}`)}>
                <TableCell className="font-medium">{po.refNumber}</TableCell>
                <TableCell>{po.vendor?.name ?? po.vendorId}</TableCell>
                <TableCell>{new Date(po.date).toLocaleDateString()}</TableCell>
                <TableCell>{total(po).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={po.status === "Billed" ? "default" : "outline"}>{po.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {po.status === "Draft" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={converting === po.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConvert(po.id);
                      }}
                    >
                      {converting === po.id ? "Converting..." : "Convert to Bill"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
