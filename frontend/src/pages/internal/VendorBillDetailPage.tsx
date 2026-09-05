import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordPaymentDialog } from "@/components/purchases/RecordPaymentDialog";
import { getVendorBill, type Payment, type VendorBill } from "@/lib/api/vendor-bills";

export function VendorBillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<(VendorBill & { payments: Payment[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  function load() {
    if (!id) return;
    getVendorBill(id).then((data) => {
      setBill(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (!bill) {
    return <p className="text-destructive">Bill not found.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Vendor Bill</h1>

      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-medium">{new Date(bill.date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-sm font-medium">{bill.amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount Due</p>
            <p className="text-sm font-medium">{bill.amountDue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant={bill.status === "Paid" ? "default" : "outline"}>{bill.status}</Badge>
          </div>
        </div>

        {bill.status !== "Paid" && (
          <Button onClick={() => setPaymentDialogOpen(true)}>Record Payment</Button>
        )}
      </div>

      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        vendorBillId={bill.id}
        amountDue={bill.amountDue}
        onRecorded={load}
      />

      <div>
        <h2 className="mb-2 text-lg font-medium">Payments</h2>
        {bill.payments.length === 0 ? (
          <p className="text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
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
