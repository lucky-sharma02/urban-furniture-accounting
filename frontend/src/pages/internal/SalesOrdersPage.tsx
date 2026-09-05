import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalesOrderFormDialog } from "@/components/sales/SalesOrderFormDialog";
import { listSalesOrders, type SalesOrder } from "@/lib/api/sales-orders";

interface SalesOrderWithCustomer extends SalesOrder {
  customer?: { name: string };
}

export function SalesOrdersPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    const data = await listSalesOrders();
    setSalesOrders(data as SalesOrderWithCustomer[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function total(so: SalesOrder) {
    return so.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sales Orders</h1>
        <Button onClick={() => setFormOpen(true)}>New Sales Order</Button>
      </div>

      <SalesOrderFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : salesOrders.length === 0 ? (
        <p className="text-muted-foreground">No sales orders yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total (before tax)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salesOrders.map((so) => (
              <TableRow key={so.id}>
                <TableCell className="font-medium">{so.customer?.name ?? so.customerId}</TableCell>
                <TableCell>{new Date(so.date).toLocaleDateString()}</TableCell>
                <TableCell>{total(so).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={so.status === "Invoiced" ? "default" : "outline"}>{so.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
