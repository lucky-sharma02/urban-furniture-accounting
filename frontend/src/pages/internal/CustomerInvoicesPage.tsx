import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/ui/search-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { listCustomerInvoices, type CustomerInvoice } from "@/lib/api/customer-invoices";
import { Landmark } from "lucide-react";

interface CustomerInvoiceWithCustomer extends CustomerInvoice {
  customer?: { name: string };
}

export function CustomerInvoicesPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const isPortal = auth?.role === "Contact";
  const [invoices, setInvoices] = useState<CustomerInvoiceWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listCustomerInvoices().then((data) => {
      setInvoices(data as CustomerInvoiceWithCustomer[]);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (invoice) =>
        invoice.refNumber.toLowerCase().includes(q) ||
        (invoice.customer?.name ?? "").toLowerCase().includes(q) ||
        invoice.status.toLowerCase().includes(q),
    );
  }, [invoices, search]);

  return (
    <div className="space-y-6">
      {isPortal && (
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">My Invoices</h1>
          <p className="mt-1 text-xs text-slate-500">Your outstanding and settled invoices with Urban Furniture.</p>
        </div>
      )}

      <SearchBar onSearch={setSearch} placeholder="Search by ref, customer, or status — press Enter" />

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading customer invoices...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center shadow-card">
          <Landmark className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">No customer invoices found</p>
          <p className="mt-1 text-xs text-slate-500">Generate an invoice from a sales order to start tracking receivables.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Reference</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Customer Entity</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-slate-700">Invoice Date</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Invoice Total</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-slate-700">Amount Due</TableHead>
                <TableHead className="h-10 px-4 text-center text-xs font-semibold text-slate-700">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer border-slate-100 transition-colors hover:bg-slate-50"
                  onClick={() => navigate(`${isPortal ? "/portal" : ""}/customer-invoices/${invoice.id}`)}
                >
                  <TableCell className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{invoice.refNumber}</TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-slate-100 text-[10px] font-bold uppercase text-slate-600">
                        {(invoice.customer?.name ?? invoice.customerId).substring(0, 2)}
                      </div>
                      <span>{invoice.customer?.name ?? invoice.customerId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs text-slate-500">
                    {new Date(invoice.date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-slate-900">
                    ₹{invoice.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs font-semibold tabular-nums">
                    <span className={invoice.amountDue > 0 ? "text-rose-600" : "text-slate-400"}>
                      ₹{invoice.amountDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        invoice.status === "Paid"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : invoice.status === "Partial"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {invoice.status}
                    </Badge>
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
