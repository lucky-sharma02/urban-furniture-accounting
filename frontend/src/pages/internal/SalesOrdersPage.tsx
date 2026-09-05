import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalesOrderFormDialog } from "@/components/sales/SalesOrderFormDialog";
import { generateInvoiceFromSalesOrder, listSalesOrders, type SalesOrder } from "@/lib/api/sales-orders";
import { Plus, FileText, ArrowRight } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar onSearch={setSearch} placeholder="Search by ref, customer, or status — press Enter" />
        <Button
          onClick={() => setFormOpen(true)}
          size="sm"
          className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          New Sales Order
        </Button>
      </div>

      <SalesOrderFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading sales orders...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center shadow-card">
          <FileText className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">No sales orders found</p>
          <p className="mt-1 text-xs text-slate-500">
            Create your first customer sales order and generate a GST invoice from it.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200">
                <TableHead className="text-xs font-semibold text-slate-700">Reference</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Customer Entity</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Order Date</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Net Amount (ex-GST)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Order Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((so) => (
                <TableRow
                  key={so.id}
                  className="cursor-pointer border-slate-100 transition-colors hover:bg-slate-50"
                  onClick={() => navigate(`/sales-orders/${so.id}`)}
                >
                  <TableCell className="font-mono text-xs font-medium text-slate-900">{so.refNumber}</TableCell>
                  <TableCell className="text-xs text-slate-900">{so.customer?.name ?? so.customerId}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {new Date(so.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-900">
                    ₹{total(so).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium ${
                        so.status === "Invoiced"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {so.status}
                    </Badge>
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
                        className="h-7 gap-1 px-2 text-xs font-medium text-slate-900 hover:bg-slate-100"
                      >
                        {generating === so.id ? "Generating..." : "Generate Invoice"}
                        <ArrowRight className="h-3 w-3" />
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
