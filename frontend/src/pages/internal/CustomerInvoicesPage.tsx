import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { listCustomerInvoices, type CustomerInvoice } from "@/lib/api/customer-invoices";

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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{isPortal ? "My Invoices" : "Customer Invoices"}</h1>

      <Input
        placeholder="Search by ref, customer, or status..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No customer invoices found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="cursor-pointer"
                onClick={() => navigate(`${isPortal ? "/portal" : ""}/customer-invoices/${invoice.id}`)}
              >
                <TableCell className="font-medium">{invoice.refNumber}</TableCell>
                <TableCell>{invoice.customer?.name ?? invoice.customerId}</TableCell>
                <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                <TableCell>{invoice.amount.toFixed(2)}</TableCell>
                <TableCell>{invoice.amountDue.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={invoice.status === "Paid" ? "default" : "outline"}>{invoice.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
