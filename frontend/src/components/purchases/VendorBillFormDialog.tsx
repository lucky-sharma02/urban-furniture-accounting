import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnalyticAccountSelect } from "@/components/shared/AnalyticAccountSelect";
import { BudgetWarningNotice } from "@/components/shared/BudgetWarningNotice";
import { listContacts, type Contact } from "@/lib/api/contacts";
import { createVendorBill } from "@/lib/api/vendor-bills";
import { firstError, isAmount, isIsoDate } from "@/lib/validation";

interface VendorBillFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function VendorBillFormDialog({ open, onOpenChange, onSaved }: VendorBillFormDialogProps) {
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [analyticAccountId, setAnalyticAccountId] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      listContacts().then((contacts) => setVendors(contacts.filter((c) => c.type !== "Customer")));
      setVendorId("");
      setDate(new Date().toISOString().slice(0, 10));
      setAmount("");
      setAnalyticAccountId("");
      setWarnings([]);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = firstError([
      [vendorId !== "", "Select a vendor."],
      [isIsoDate(date), "Enter a valid bill date."],
      [isAmount(amount), "Bill amount must be a number like 1200 or 1200.50."],
      [Number(amount) > 0, "Bill amount must be greater than zero."],
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const bill = await createVendorBill({
        vendorId,
        date,
        amount: Number(amount),
        analyticAccountId: analyticAccountId || null,
      });
      onSaved();
      if (bill.budgetWarnings && bill.budgetWarnings.length > 0) {
        setWarnings(bill.budgetWarnings);
      } else {
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-elevated">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-display text-slate-900">
              New Vendor Bill
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vendor" required className="text-xs font-semibold text-slate-700">Vendor / Supplier</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger id="vendor" className="h-9 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 shadow-card">
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id} className="text-xs text-slate-700">
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date" required className="text-xs font-semibold text-slate-700">Bill Date</Label>
              <Input
                id="date"
                type="date"
                required
                className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount" required className="text-xs font-semibold text-slate-700">Bill Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white tabular-nums"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="analytic" className="text-xs font-semibold text-slate-700">Budget Analytics</Label>
              <AnalyticAccountSelect id="analytic" value={analyticAccountId} onChange={setAnalyticAccountId} />
              <p className="text-[11px] text-slate-400">Books this bill against a budget line (Expenses). Optional.</p>
            </div>

            {error && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <BudgetWarningNotice warnings={warnings} title="Bill recorded — budget notice" />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {warnings.length > 0 ? (
              <Button
                type="button"
                size="sm"
                className="h-9 bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-medium border-slate-200"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || !vendorId}
                  className="h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle ml-2"
                >
                  {saving ? "Saving Bill..." : "Record Bill"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
