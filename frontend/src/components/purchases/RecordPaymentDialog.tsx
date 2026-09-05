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
import { listAccounts, type Account } from "@/lib/api/accounts";
import { recordVendorBillPayment } from "@/lib/api/vendor-bills";

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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      listAccounts().then((data) => setAccounts(data.filter((a) => a.type === "Bank" || a.type === "Cash")));
      setPaymentAccountId("");
      setDate(new Date().toISOString().slice(0, 10));
      setAmount(String(amountDue));
      setError(null);
    }
  }, [open, amountDue]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-muted-foreground">Amount due: {amountDue.toFixed(2)}</p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-account">Pay From</Label>
              <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                <SelectTrigger id="payment-account">
                  <SelectValue placeholder="Select Bank or Cash" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-date">Date</Label>
              <Input id="payment-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                max={amountDue}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving || !paymentAccountId}>
              {saving ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
