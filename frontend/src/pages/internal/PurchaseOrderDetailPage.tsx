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

interface PurchaseOrderDetail extends PurchaseOrder {
  vendor?: { name: string };
  lines: (PurchaseOrderLine & { product?: { name: string } })[];
  vendorBills: VendorBill[];
}

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [po, setPo] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [converting, setConverting] = useState(false);

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
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (!po) {
    return <p className="text-destructive">Purchase order not found.</p>;
  }

  const total = po.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  async function handleConvert() {
    setConverting(true);
    try {
      const bill = await convertPurchaseOrderToBill(po!.id);
      navigate(`/vendor-bills/${bill.id}`);
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Order {po.refNumber}</h1>
          <p className="text-sm text-muted-foreground">{po.vendor?.name ?? po.vendorId}</p>
        </div>
        <div className="flex gap-2">
          {po.status === "Draft" && (
            <>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button disabled={converting} onClick={handleConvert}>
                {converting ? "Converting..." : "Convert to Bill"}
              </Button>
            </>
          )}
        </div>
      </div>

      <PurchaseOrderFormDialog open={editOpen} onOpenChange={setEditOpen} onSaved={load} editingOrder={po} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Date</p>
          <p className="text-sm font-medium">{new Date(po.date).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-medium">{total.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge variant={po.status === "Billed" ? "default" : "outline"}>{po.status}</Badge>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Lines</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {po.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.product?.name ?? line.productId}</TableCell>
                <TableCell>{line.quantity}</TableCell>
                <TableCell>{line.unitPrice.toFixed(2)}</TableCell>
                <TableCell>{(line.quantity * line.unitPrice).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {po.vendorBills.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-medium">Vendor Bills</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.vendorBills.map((bill) => (
                <TableRow
                  key={bill.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/vendor-bills/${bill.id}`)}
                >
                  <TableCell className="font-medium">{bill.refNumber}</TableCell>
                  <TableCell>{bill.amount.toFixed(2)}</TableCell>
                  <TableCell>{bill.amountDue.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={bill.status === "Paid" ? "default" : "outline"}>{bill.status}</Badge>
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
