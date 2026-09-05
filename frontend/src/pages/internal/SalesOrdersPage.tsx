import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalesOrderFormDialog } from "@/components/sales/SalesOrderFormDialog";
import { generateInvoiceFromSalesOrder, listSalesOrders, type SalesOrder } from "@/lib/api/sales-orders";

interface SalesOrderWithCustomer extends SalesOrder {
  customer?: { name: string };
}

export function SalesOrdersPage() {
  const navigate = useNavigate();
  const [salesOrders, setSalesOrders] = useState<SalesOrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  async function handleGenerateInvoice(soId: string) {
    setGenerating(soId);
    try {
      const invoice = await generateInvoiceFromSalesOrder(soId);
      navigate(`/customer-invoices/${invoice.id}`);
    } finally {
      setGenerating(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return salesOrders;
    return salesOrders.filter(
      (so) =>
        so.refNumber.toLowerCase().includes(q) ||
        (so.customer?.name ?? "").toLowerCase().includes(q) ||
        so.status.toLowerCase().includes(q),
    );
  }, [salesOrders, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sales Orders</h1>
        <Button onClick={() => setFormOpen(true)}>New Sales Order</Button>
      </div>

      <Input
        placeholder="Search by ref, customer, or status..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <SalesOrderFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No sales orders found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total (before tax)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((so) => (
              <TableRow key={so.id} className="cursor-pointer" onClick={() => navigate(`/sales-orders/${so.id}`)}>
                <TableCell className="font-medium">{so.refNumber}</TableCell>
                <TableCell>{so.customer?.name ?? so.customerId}</TableCell>
                <TableCell>{new Date(so.date).toLocaleDateString()}</TableCell>
                <TableCell>{total(so).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={so.status === "Invoiced" ? "default" : "outline"}>{so.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {so.status === "Draft" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={generating === so.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateInvoice(so.id);
                      }}
                    >
                      {generating === so.id ? "Generating..." : "Generate Invoice"}
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
