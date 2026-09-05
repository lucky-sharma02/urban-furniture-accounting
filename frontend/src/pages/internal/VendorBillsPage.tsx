import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VendorBillFormDialog } from "@/components/purchases/VendorBillFormDialog";
import { listVendorBills, type VendorBill } from "@/lib/api/vendor-bills";
import { Plus } from "lucide-react";

interface VendorBillWithVendor extends VendorBill {
  vendor?: { name: string };
}

export function VendorBillsPage() {
  const navigate = useNavigate();
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar onSearch={setSearch} placeholder="Search by ref, vendor, or status — press Enter" />
        <Button onClick={() => setFormOpen(true)} size="sm" className="h-9 gap-1.5 bg-slate-900 px-4 text-xs font-semibold text-white shadow-subtle transition-colors hover:bg-slate-800">
          <Plus className="h-3.5 w-3.5" />
          New Bill
        </Button>
      </div>

      <VendorBillFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200 shadow-card">
          <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mb-3"></div>
          <p>Loading vendor bills...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-dashed border-slate-300 bg-white shadow-card">
          <p className="text-sm font-semibold text-slate-800">No vendor bills found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Create a new bill directly or convert a purchase order into a bill to start tracking supplier payables.</p>
          <Button onClick={() => setFormOpen(true)} size="sm" variant="outline" className="mt-4 text-xs font-medium">
            Create First Bill
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-card">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-700 h-10 px-4">Reference</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 h-10 px-4">Vendor</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 h-10 px-4">Bill Date</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700 h-10 px-4">Total Amount</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700 h-10 px-4">Amount Due</TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-700 h-10 px-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((bill) => (
                <TableRow
                  key={bill.id}
                  className="cursor-pointer border-slate-100 hover:bg-slate-50/80 transition-colors"
                  onClick={() => navigate(`/vendor-bills/${bill.id}`)}
                >
                  <TableCell className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{bill.refNumber}</TableCell>
                  <TableCell className="font-medium text-xs text-slate-900 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                        {(bill.vendor?.name ?? bill.vendorId).substring(0, 2)}
                      </div>
                      <span>{bill.vendor?.name ?? bill.vendorId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 px-4 py-3">{new Date(bill.date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</TableCell>
                  <TableCell className="text-right text-xs font-semibold text-slate-900 tabular-nums px-4 py-3">₹{bill.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums px-4 py-3">
                    <span className={bill.amountDue > 0 ? "text-rose-600" : "text-slate-400"}>
                      ₹{bill.amountDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell className="text-center px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        bill.status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : bill.status === "Partial"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {bill.status}
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
