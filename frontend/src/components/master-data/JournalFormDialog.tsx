import type { JournalType } from "@urban-furniture/shared";
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
import { createJournal, updateJournal, type Journal } from "@/lib/api/journals";

const JOURNAL_TYPES: JournalType[] = ["Sales", "Purchase", "Bank", "Cash"];

interface JournalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journal?: Journal;
  onSaved: () => void;
}

const emptyForm = { name: "", type: "Sales" as JournalType };

export function JournalFormDialog({ open, onOpenChange, journal, onSaved }: JournalFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(journal ? { name: journal.name, type: journal.type } : emptyForm);
      setError(null);
    }
  }, [open, journal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (journal) {
        await updateJournal(journal.id, form);
      } else {
        await createJournal(form);
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
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-display text-slate-900">
              {journal ? "Edit Accounting Journal" : "New Accounting Journal"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Journal Name</Label>
              <Input
                id="name"
                required
                placeholder="e.g. Primary Commercial Sales"
                className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type" className="text-xs font-semibold text-slate-700">Journal Book Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as JournalType })}>
                <SelectTrigger id="type" className="h-9 text-xs bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 shadow-card">
                  {JOURNAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="text-xs text-slate-700">
                      {type}
                    </SelectItem>
                  ))}
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
              {saving ? "Saving..." : journal ? "Update Journal" : "Create Journal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
