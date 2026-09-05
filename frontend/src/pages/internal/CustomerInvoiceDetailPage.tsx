import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordInvoicePaymentDialog } from "@/components/sales/RecordInvoicePaymentDialog";
import { getCustomerInvoice, type CustomerInvoice, type Payment } from "@/lib/api/customer-invoices";

export function CustomerInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<(CustomerInvoice & { payments: Payment[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  function load() {
    if (!id) return;
    getCustomerInvoice(id).then((data) => {
      setInvoice(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (!invoice) {
    return <p className="text-destructive">Invoice not found.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Customer Invoice {invoice.refNumber}</h1>

      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-medium">{new Date(invoice.date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Base Amount</p>
            <p className="text-sm font-medium">{invoice.baseAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tax (18%)</p>
            <p className="text-sm font-medium">{invoice.taxAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-medium">{invoice.amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount Due</p>
            <p className="text-sm font-medium">{invoice.amountDue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant={invoice.status === "Paid" ? "default" : "outline"}>{invoice.status}</Badge>
          </div>
        </div>

        {invoice.status !== "Paid" && (
          <Button onClick={() => setPaymentDialogOpen(true)}>Record Payment</Button>
        )}
      </div>

      <RecordInvoicePaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoiceId={invoice.id}
        amountDue={invoice.amountDue}
        onRecorded={load}
      />

      <div>
        <h2 className="mb-2 text-lg font-medium">Payments</h2>
        {invoice.payments.length === 0 ? (
          <p className="text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Deposited To</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.refNumber}</TableCell>
                  <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                  <TableCell>{payment.paymentAccount?.name ?? payment.paymentAccountId}</TableCell>
                  <TableCell>{payment.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
