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
import {
  createAnalyticAccount,
  createBudget,
  listAnalyticAccounts,
  type AnalyticAccount,
} from "@/lib/api/analytic-accounts";
import { firstError, isAmount, isIsoDate, isNonEmpty } from "@/lib/validation";

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const NEW_ACCOUNT_VALUE = "__new__";

export function BudgetFormDialog({ open, onOpenChange, onSaved }: BudgetFormDialogProps) {
  const [analyticAccounts, setAnalyticAccounts] = useState<AnalyticAccount[]>([]);
  const [analyticAccountId, setAnalyticAccountId] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [periodStart, setPeriodStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [plannedAmount, setPlannedAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      listAnalyticAccounts().then(setAnalyticAccounts);
      setAnalyticAccountId("");
      setNewAccountName("");
      setPeriodStart(new Date().toISOString().slice(0, 10));
      setPeriodEnd(new Date().toISOString().slice(0, 10));
      setPlannedAmount("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = firstError([
      [analyticAccountId !== "", "Select an analytic account."],
      [
        analyticAccountId !== NEW_ACCOUNT_VALUE || isNonEmpty(newAccountName),
        "New account name is required.",
      ],
      [isIsoDate(periodStart), "Enter a valid period start date."],
      [isIsoDate(periodEnd), "Enter a valid period end date."],
      [Date.parse(periodEnd) >= Date.parse(periodStart), "Period end must be on or after the start date."],
      [isAmount(plannedAmount), "Planned amount must be a number like 1200 or 1200.50."],
      [Number(plannedAmount) > 0, "Planned amount must be greater than zero."],
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let targetId = analyticAccountId;
      if (analyticAccountId === NEW_ACCOUNT_VALUE) {
        const created = await createAnalyticAccount(newAccountName);
        targetId = created.id;
      }
      await createBudget(targetId, {
        periodStart,
        periodEnd,
        plannedAmount: Number(plannedAmount),
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const isNewAccount = analyticAccountId === NEW_ACCOUNT_VALUE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-slate-200 bg-white shadow-elevated sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-slate-900">New Budget</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="analytic-account" required className="text-xs font-semibold text-slate-700">Analytic Account</Label>
              <Select value={analyticAccountId} onValueChange={setAnalyticAccountId}>
                <SelectTrigger id="analytic-account" className="h-9 border-slate-200 bg-slate-50 text-xs">
                  <SelectValue placeholder="Select or create" />
                </SelectTrigger>
                <SelectContent className="border border-slate-200 bg-white shadow-card">
                  {analyticAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id} className="text-xs">
                      {account.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_ACCOUNT_VALUE} className="text-xs">+ New analytic account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isNewAccount && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-account-name" required className="text-xs font-semibold text-slate-700">New Account Name</Label>
                <Input
                  id="new-account-name"
                  required
                  className="h-9 border-slate-200 bg-slate-50 text-xs focus:bg-white"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="period-start" required className="text-xs font-semibold text-slate-700">Period Start</Label>
                <Input
                  id="period-start"
                  type="date"
                  required
                  className="h-9 border-slate-200 bg-slate-50 text-xs focus:bg-white"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="period-end" required className="text-xs font-semibold text-slate-700">Period End</Label>
                <Input
                  id="period-end"
                  type="date"
                  required
                  className="h-9 border-slate-200 bg-slate-50 text-xs focus:bg-white"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="planned-amount" required className="text-xs font-semibold text-slate-700">Planned Amount (₹)</Label>
              <Input
                id="planned-amount"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                className="h-9 border-slate-200 bg-slate-50 text-xs tabular-nums focus:bg-white"
                value={plannedAmount}
                onChange={(e) => setPlannedAmount(e.target.value)}
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
              disabled={saving || !analyticAccountId || (isNewAccount && !newAccountName)}
              className="ml-2 h-9 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
            >
              {saving ? "Saving..." : "Create Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
