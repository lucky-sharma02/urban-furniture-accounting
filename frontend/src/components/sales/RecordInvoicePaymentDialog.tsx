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
import { recordCustomerInvoicePayment } from "@/lib/api/customer-invoices";
import { firstError, isAmount, isIsoDate } from "@/lib/validation";

interface RecordInvoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  amountDue: number;
  onRecorded: () => void;
}

export function RecordInvoicePaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  amountDue,
  onRecorded,
}: RecordInvoicePaymentDialogProps) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      listPaymentAccounts().then(setAccounts);
      setPaymentAccountId("");
      setDate(new Date().toISOString().slice(0, 10));
      setAmount(String(amountDue));
      setNote("");
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
      await recordCustomerInvoicePayment(invoiceId, {
        amount: Number(amount),
        date,
        paymentAccountId,
        note: note.trim() || undefined,
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
      <DialogContent className="border border-slate-200 bg-white shadow-elevated sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-slate-900">
              Record Customer Payment
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="text-xs font-semibold text-slate-500">Payment Type: Receive · Amount Due:</span>
              <span className="font-display text-sm font-bold tabular-nums text-rose-600">
                ₹{amountDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-payment-account" required className="text-xs font-semibold text-slate-700">
                Deposit Account (Bank / Cash)
              </Label>
              <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                <SelectTrigger id="invoice-payment-account" className="h-9 border-slate-200 bg-slate-50 text-xs">
                  <SelectValue placeholder="Select Bank or Cash account" />
                </SelectTrigger>
                <SelectContent className="border border-slate-200 bg-white shadow-card">
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id} className="text-xs text-slate-700">
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-payment-date" required className="text-xs font-semibold text-slate-700">
                Payment Date
              </Label>
              <Input
                id="invoice-payment-date"
                type="date"
                required
                className="h-9 border-slate-200 bg-slate-50 text-xs focus:bg-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-payment-amount" required className="text-xs font-semibold text-slate-700">
                Amount Received (₹)
              </Label>
              <Input
                id="invoice-payment-amount"
                type="number"
                min="0.01"
                max={amountDue}
                step="0.01"
                required
                placeholder="0.00"
                className="h-9 border-slate-200 bg-slate-50 text-xs tabular-nums focus:bg-white"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-payment-note" className="text-xs font-semibold text-slate-700">
                Note
              </Label>
              <Input
                id="invoice-payment-note"
                placeholder="Optional reference or memo"
                className="h-9 border-slate-200 bg-slate-50 text-xs focus:bg-white"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 border-slate-200 text-xs font-medium"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !paymentAccountId}
              className="ml-2 h-9 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
            >
              {saving ? "Posting Payment..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
