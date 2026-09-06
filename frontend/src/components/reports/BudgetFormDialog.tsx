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
import { createBudget, updateBudget } from "@/lib/api/analytic-accounts";
import { listContacts, type Contact } from "@/lib/api/contacts";
import type { BudgetReport } from "@/lib/api/reports";
import { firstError, isIsoDate, isNonEmpty } from "@/lib/validation";

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  editingBudget?: BudgetReport | null;
}

interface LineRow {
  key: string;
  analyticAccountId: string;
  type: "Income" | "Expenses";
  committedAmount: string;
}

function emptyLine(): LineRow {
  return { key: crypto.randomUUID(), analyticAccountId: "", type: "Expenses", committedAmount: "" };
}

const today = () => new Date().toISOString().slice(0, 10);

export function BudgetFormDialog({ open, onOpenChange, onSaved, editingBudget }: BudgetFormDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [responsibleId, setResponsibleId] = useState("");
  const [lines, setLines] = useState<LineRow[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    listContacts().then(setContacts);
    if (editingBudget) {
      setName(editingBudget.name);
      setPeriodStart(editingBudget.periodStart.slice(0, 10));
      setPeriodEnd(editingBudget.periodEnd.slice(0, 10));
      setResponsibleId(editingBudget.responsibleId ?? "");
      setLines(
        editingBudget.lines.map((l) => ({
          key: crypto.randomUUID(),
          analyticAccountId: l.analyticAccountId,
          type: l.type,
          committedAmount: String(l.committedAmount),
        })),
      );
    } else {
      setName("");
      setPeriodStart(today());
      setPeriodEnd(today());
      setResponsibleId("");
      setLines([emptyLine()]);
    }
    setError(null);
  }, [open, editingBudget]);

  function updateLine(key: string, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }
  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = firstError([
      [isNonEmpty(name), "Budget name is required."],
      [isIsoDate(periodStart), "Enter a valid period start date."],
      [isIsoDate(periodEnd), "Enter a valid period end date."],
      [Date.parse(periodEnd) >= Date.parse(periodStart), "Period end must be on or after the start date."],
      [lines.every((l) => l.analyticAccountId !== ""), "Every budget line needs an analytic account."],
      [
        lines.every((l) => /^\d+(\.\d{1,2})?$/.test(l.committedAmount.trim()) && Number(l.committedAmount) > 0),
        "Every committed amount must be a positive number.",
      ],
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        periodStart,
        periodEnd,
        responsibleId: responsibleId || null,
        lines: lines.map((l) => ({
          analyticAccountId: l.analyticAccountId,
          type: l.type,
          committedAmount: Number(l.committedAmount),
        })),
      };
      if (editingBudget) {
        await updateBudget(editingBudget.id, input);
      } else {
        await createBudget(input);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto border border-slate-200 bg-white shadow-elevated sm:max-w-xl">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-slate-900">
              {editingBudget ? "Edit Budget" : "New Budget"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget-name" required className="text-xs font-semibold text-slate-700">
                Budget Name
              </Label>
              <Input
                id="budget-name"
                required
                placeholder="e.g. FY26 Living Room Collection"
                className="h-9 border-slate-200 bg-slate-50 text-xs focus:bg-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="period-start" required className="text-xs font-semibold text-slate-700">
                  Period Start
                </Label>
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
                <Label htmlFor="period-end" required className="text-xs font-semibold text-slate-700">
                  Period End
                </Label>
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
              <Label htmlFor="responsible" className="text-xs font-semibold text-slate-700">
                Responsible
              </Label>
              <Select value={responsibleId || "__none__"} onValueChange={(v) => setResponsibleId(v === "__none__" ? "" : v)}>
                <SelectTrigger id="responsible" className="h-9 border-slate-200 bg-slate-50 text-xs">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="border border-slate-200 bg-white shadow-card">
                  <SelectItem value="__none__" className="text-xs text-slate-500">
                    Unassigned
                  </SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs text-slate-700">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
              <Label required className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
                Budget Lines
              </Label>
              <div className="grid grid-cols-[1fr_120px_130px_60px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span>Analytic</span>
                <span>Type</span>
                <span className="text-right">Committed (₹)</span>
                <span />
              </div>

              {lines.map((line) => (
                <div key={line.key} className="grid grid-cols-[1fr_120px_130px_60px] items-center gap-2">
                  <AnalyticAccountSelect
                    value={line.analyticAccountId}
                    onChange={(id) => updateLine(line.key, { analyticAccountId: id })}
                    allowNone={false}
                  />
                  <Select
                    value={line.type}
                    onValueChange={(v) => updateLine(line.key, { type: v as "Income" | "Expenses" })}
                  >
                    <SelectTrigger className="h-9 border-slate-200 bg-slate-50 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-slate-200 bg-white shadow-card">
                      <SelectItem value="Income" className="text-xs">
                        Income
                      </SelectItem>
                      <SelectItem value="Expenses" className="text-xs">
                        Expenses
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="h-9 border-slate-200 bg-slate-50 text-right text-xs tabular-nums focus:bg-white"
                    value={line.committedAmount}
                    onChange={(e) => updateLine(line.key, { committedAmount: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    disabled={lines.length <= 1}
                    onClick={() => removeLine(line.key)}
                  >
                    ✕
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-fit border-slate-200 text-xs font-medium"
                onClick={addLine}
              >
                + Add Line
              </Button>
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
              disabled={saving}
              className="ml-2 h-9 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
            >
              {saving ? "Saving..." : editingBudget ? "Save Changes" : "Create Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
