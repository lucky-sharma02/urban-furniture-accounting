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

interface SalesOrderDetail extends SalesOrder {
  customer?: { name: string };
  lines: (SalesOrderLine & { product?: { name: string } })[];
  invoices: CustomerInvoice[];
}

export function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [so, setSo] = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

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
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (!so) {
    return <p className="text-destructive">Sales order not found.</p>;
  }

  const total = so.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  async function handleGenerateInvoice() {
    setGenerating(true);
    try {
      const invoice = await generateInvoiceFromSalesOrder(so!.id);
      navigate(`/customer-invoices/${invoice.id}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales Order {so.refNumber}</h1>
          <p className="text-sm text-muted-foreground">{so.customer?.name ?? so.customerId}</p>
        </div>
        <div className="flex gap-2">
          {so.status === "Draft" && (
            <>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button disabled={generating} onClick={handleGenerateInvoice}>
                {generating ? "Generating..." : "Generate Invoice"}
              </Button>
            </>
          )}
        </div>
      </div>

      <SalesOrderFormDialog open={editOpen} onOpenChange={setEditOpen} onSaved={load} editingOrder={so} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Date</p>
          <p className="text-sm font-medium">{new Date(so.date).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total (before tax)</p>
          <p className="text-sm font-medium">{total.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge variant={so.status === "Invoiced" ? "default" : "outline"}>{so.status}</Badge>
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
            {so.lines.map((line) => (
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

      {so.invoices.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-medium">Customer Invoices</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {so.invoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/customer-invoices/${invoice.id}`)}
                >
                  <TableCell className="font-medium">{invoice.refNumber}</TableCell>
                  <TableCell>{invoice.amount.toFixed(2)}</TableCell>
                  <TableCell>{invoice.amountDue.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === "Paid" ? "default" : "outline"}>{invoice.status}</Badge>
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
