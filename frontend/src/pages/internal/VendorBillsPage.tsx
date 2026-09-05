import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VendorBillFormDialog } from "@/components/purchases/VendorBillFormDialog";
import { listVendorBills, type VendorBill } from "@/lib/api/vendor-bills";

interface VendorBillWithVendor extends VendorBill {
  vendor?: { name: string };
}

export function VendorBillsPage() {
  const navigate = useNavigate();
  const [vendorBills, setVendorBills] = useState<VendorBillWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    const data = await listVendorBills();
    setVendorBills(data as VendorBillWithVendor[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vendor Bills</h1>
        <Button onClick={() => setFormOpen(true)}>New Bill</Button>
      </div>

      <VendorBillFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : vendorBills.length === 0 ? (
        <p className="text-muted-foreground">No vendor bills yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendorBills.map((bill) => (
              <TableRow
                key={bill.id}
                className="cursor-pointer"
                onClick={() => navigate(`/vendor-bills/${bill.id}`)}
              >
                <TableCell className="font-medium">{bill.vendor?.name ?? bill.vendorId}</TableCell>
                <TableCell>{new Date(bill.date).toLocaleDateString()}</TableCell>
                <TableCell>{bill.amount.toFixed(2)}</TableCell>
                <TableCell>{bill.amountDue.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={bill.status === "Paid" ? "default" : "outline"}>{bill.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
