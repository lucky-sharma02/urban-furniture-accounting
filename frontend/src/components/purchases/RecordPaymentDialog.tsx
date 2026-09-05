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
import { listPaymentAccounts, type PaymentAccount } from "@/lib/api/accounts";
import { recordVendorBillPayment } from "@/lib/api/vendor-bills";
import { firstError, isAmount, isIsoDate } from "@/lib/validation";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorBillId: string;
  amountDue: number;
  onRecorded: () => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  vendorBillId,
  amountDue,
  onRecorded,
}: RecordPaymentDialogProps) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      listPaymentAccounts().then(setAccounts);
      setPaymentAccountId("");
      setDate(new Date().toISOString().slice(0, 10));
      setAmount(String(amountDue));
      setError(null);
    }
  }, [open, amountDue]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = firstError([
      [paymentAccountId !== "", "Select a Bank or Cash account."],
      [isIsoDate(date), "Enter a valid payment date."],
      [isAmount(amount), "Amount must be a number like 1200 or 1200.50."],
      [Number(amount) > 0, "Amount must be greater than zero."],
      [Number(amount) <= amountDue, `Amount cannot exceed the balance due of ₹${amountDue.toFixed(2)}.`],
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await recordVendorBillPayment(vendorBillId, {
        amount: Number(amount),
        date,
        paymentAccountId,
      });
      onRecorded();
      onOpenChange(false);
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
              Record Supplier Payment
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Remaining Balance:</span>
              <span className="text-sm font-bold font-display text-rose-600 tabular-nums">
                ₹{amountDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-account" required className="text-xs font-semibold text-slate-700">Disbursement Account (Bank / Cash)</Label>
              <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                <SelectTrigger id="payment-account" className="h-9 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select Bank or Cash account" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 shadow-card">
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id} className="text-xs text-slate-700">
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-date" required className="text-xs font-semibold text-slate-700">Payment Date</Label>
              <Input
                id="payment-date"
                type="date"
                required
                className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-amount" required className="text-xs font-semibold text-slate-700">Disbursement Amount (₹)</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                max={amountDue}
                step="0.01"
                required
                placeholder="0.00"
                className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white tabular-nums"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
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
              disabled={saving || !paymentAccountId}
              className="h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle ml-2"
            >
              {saving ? "Posting Payment..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
