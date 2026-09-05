import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listCustomerInvoices, type CustomerInvoice } from "@/lib/api/customer-invoices";

interface CustomerInvoiceWithCustomer extends CustomerInvoice {
  customer?: { name: string };
}

export function CustomerInvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<CustomerInvoiceWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCustomerInvoices().then((data) => {
      setInvoices(data as CustomerInvoiceWithCustomer[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Customer Invoices</h1>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : invoices.length === 0 ? (
        <p className="text-muted-foreground">No customer invoices yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="cursor-pointer"
                onClick={() => navigate(`/customer-invoices/${invoice.id}`)}
              >
                <TableCell className="font-medium">{invoice.customer?.name ?? invoice.customerId}</TableCell>
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
