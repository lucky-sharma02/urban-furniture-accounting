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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Budget</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="analytic-account">Analytic Account</Label>
              <Select value={analyticAccountId} onValueChange={setAnalyticAccountId}>
                <SelectTrigger id="analytic-account">
                  <SelectValue placeholder="Select or create" />
                </SelectTrigger>
                <SelectContent>
                  {analyticAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_ACCOUNT_VALUE}>+ New analytic account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isNewAccount && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-account-name">New Account Name</Label>
                <Input
                  id="new-account-name"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="period-start">Period Start</Label>
                <Input
                  id="period-start"
                  type="date"
                  required
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="period-end">Period End</Label>
                <Input
                  id="period-end"
                  type="date"
                  required
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="planned-amount">Planned Amount</Label>
              <Input
                id="planned-amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={plannedAmount}
                onChange={(e) => setPlannedAmount(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={saving || !analyticAccountId || (isNewAccount && !newAccountName)}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
