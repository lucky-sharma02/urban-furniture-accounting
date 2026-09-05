import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VendorBillFormDialog } from "@/components/purchases/VendorBillFormDialog";
import { useAuth } from "@/lib/auth-context";
import { listVendorBills, type VendorBill } from "@/lib/api/vendor-bills";

interface VendorBillWithVendor extends VendorBill {
  vendor?: { name: string };
}

export function VendorBillsPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const isPortal = auth?.role === "Contact";
  const [vendorBills, setVendorBills] = useState<VendorBillWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const data = await listVendorBills();
    setVendorBills(data as VendorBillWithVendor[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendorBills;
    return vendorBills.filter(
      (bill) =>
        bill.refNumber.toLowerCase().includes(q) ||
        (bill.vendor?.name ?? "").toLowerCase().includes(q) ||
        bill.status.toLowerCase().includes(q),
    );
  }, [vendorBills, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isPortal ? "My Bills" : "Vendor Bills"}</h1>
        {!isPortal && <Button onClick={() => setFormOpen(true)}>New Bill</Button>}
      </div>

      <Input
        placeholder="Search by ref, vendor, or status..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {!isPortal && <VendorBillFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No vendor bills found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((bill) => (
              <TableRow
                key={bill.id}
                className="cursor-pointer"
                onClick={() => navigate(`${isPortal ? "/portal" : ""}/vendor-bills/${bill.id}`)}
              >
                <TableCell className="font-medium">{bill.refNumber}</TableCell>
                <TableCell>{bill.vendor?.name ?? bill.vendorId}</TableCell>
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
