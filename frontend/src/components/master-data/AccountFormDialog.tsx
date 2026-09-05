import type { AccountType } from "@urban-furniture/shared";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccount, updateAccount, type Account } from "@/lib/api/accounts";
import { isNonEmpty } from "@/lib/validation";

// Balance Sheet types vs P&L types — grouped in the dropdown so users pick from
// the right half of the accounting equation instead of a flat, undifferentiated list.
const BALANCE_SHEET_TYPES: AccountType[] = ["Asset", "Liability", "Bank", "Cash", "Capital"];
const PL_TYPES: AccountType[] = ["Income", "Expenses", "OtherExpenses"];

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
  onSaved: () => void;
}

const emptyForm = { name: "", type: "Asset" as AccountType };

export function AccountFormDialog({ open, onOpenChange, account, onSaved }: AccountFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(account ? { name: account.name, type: account.type } : emptyForm);
      setError(null);
    }
  }, [open, account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isNonEmpty(form.name)) {
      setError("Account name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (account) {
        await updateAccount(account.id, form);
      } else {
        await createAccount(form);
      }
      onSaved();
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
              {account ? "Edit General Ledger Account" : "New General Ledger Account"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" required className="text-xs font-semibold text-slate-700">Account Name</Label>
              <Input
                id="name"
                required
                placeholder="e.g. Workshop Raw Timber Inventory"
                className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type" required className="text-xs font-semibold text-slate-700">Accounting Classification</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as AccountType })}>
                <SelectTrigger id="type" className="h-9 text-xs bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 shadow-card">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance Sheet (Permanent)</SelectLabel>
                    {BALANCE_SHEET_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs text-slate-700">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Profit &amp; Loss (Nominal)</SelectLabel>
                    {PL_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs text-slate-700">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
              disabled={saving}
              className="h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle ml-2"
            >
              {saving ? "Saving..." : account ? "Update Account" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
