import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAccounts, type Account } from "@/lib/api/accounts";
import { listContacts, type Contact } from "@/lib/api/contacts";
import { listJournals, type Journal } from "@/lib/api/journals";
import { createJournalEntry, type JournalEntryLineInput } from "@/lib/api/journal-entries";

interface LineRow extends JournalEntryLineInput {
  key: string;
}

function emptyRow(): LineRow {
  return { key: crypto.randomUUID(), accountId: "", partnerId: undefined, debit: 0, credit: 0 };
}

export function PostEntryPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);

  const [journalId, setJournalId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<LineRow[]>([emptyRow(), emptyRow()]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listAccounts().then(setAccounts);
    listContacts().then(setContacts);
    listJournals().then(setJournals);
  }, []);

  // Decoupled from the fetch above so the default selection is derived from
  // state rather than set inside a promise callback — avoids losing the
  // auto-selection if React re-mounts/re-runs the fetch effect (e.g. StrictMode).
  useEffect(() => {
    if (journals.length > 0 && !journalId) {
      setJournalId(journals[0].id);
    }
  }, [journals, journalId]);

  // Client-side mirror of the server's balance rule, purely for immediate feedback —
  // the server (postJournalEntry) is still the source of truth and re-validates on submit.
  const { totalDebit, totalCredit, isBalanced } = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    return {
      totalDebit: debit,
      totalCredit: credit,
      isBalanced: Math.round(debit * 100) === Math.round(credit * 100),
    };
  }, [lines]);

  function updateLine(key: string, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyRow()]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((line) => line.key !== key)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const entry = await createJournalEntry({
        journalId,
        date,
        reference: reference || undefined,
        lines: lines.map(({ accountId, partnerId, debit, credit }) => ({
          accountId,
          partnerId,
          debit,
          credit,
        })),
      });
      setSuccess(`Posted entry ${entry.id}`);
      setLines([emptyRow(), emptyRow()]);
      setReference("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">Post Journal Entry</h1>
        <p className="text-xs text-slate-500 mt-0.5">Record double-entry transactions across permanent and nominal ledger journals.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-5 rounded-lg border border-slate-200 bg-white shadow-card">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date" className="text-xs font-semibold text-slate-700">Accounting Date</Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-xs bg-slate-50 border-slate-200 font-mono" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="journal" className="text-xs font-semibold text-slate-700">Journal Book</Label>
              <Select value={journalId} onValueChange={setJournalId}>
                <SelectTrigger id="journal" className="h-9 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select a journal" />
                </SelectTrigger>
                <SelectContent>
                  {journals.map((journal) => (
                    <SelectItem key={journal.id} value={journal.id}>
                      {journal.name} ({journal.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reference" className="text-xs font-semibold text-slate-700">Reference / Memo</Label>
              <Input id="reference" placeholder="e.g. INV/2026/001" value={reference} onChange={(e) => setReference(e.target.value)} className="h-9 text-xs bg-slate-50 border-slate-200" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-slate-200 bg-white shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-display">Journal Entry Lines</h3>
            <span className="text-[11px] text-slate-400 font-mono">Minimum 2 lines required</span>
          </div>

          <div className="grid grid-cols-[1fr_1fr_120px_120px_auto] gap-2 px-1 text-xs font-semibold text-slate-700">
            <span>Account Title</span>
            <span>Partner (Optional)</span>
            <span className="text-right">Debit (₹)</span>
            <span className="text-right">Credit (₹)</span>
            <span className="w-16" />
          </div>

          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.key} className="grid grid-cols-[1fr_1fr_120px_120px_auto] items-center gap-2">
                <Select value={line.accountId} onValueChange={(value) => updateLine(line.key, { accountId: value })}>
                  <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={line.partnerId ?? "none"}
                  onValueChange={(value) => updateLine(line.key, { partnerId: value === "none" ? undefined : value })}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Partner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={line.debit || ""}
                  onChange={(e) => updateLine(line.key, { debit: Number(e.target.value) || 0 })}
                  className="h-9 text-xs text-right tabular-nums bg-slate-50 border-slate-200 font-mono"
                />

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={line.credit || ""}
                  onChange={(e) => updateLine(line.key, { credit: Number(e.target.value) || 0 })}
                  className="h-9 text-xs text-right tabular-nums bg-slate-50 border-slate-200 font-mono"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={lines.length <= 2}
                  onClick={() => removeLine(line.key)}
                  className="h-9 w-16 text-xs text-rose-600 hover:bg-rose-50"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" className="text-xs h-8 bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700" onClick={addLine}>
            + Add Line
          </Button>
        </div>

        <div
          className={cn(
            "w-fit rounded-md border px-4 py-2 text-xs font-medium tabular-nums flex items-center gap-2",
            isBalanced
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800",
          )}
        >
          <span>Total Debit: <strong className="font-mono">₹{totalDebit.toFixed(2)}</strong></span>
          <span>·</span>
          <span>Total Credit: <strong className="font-mono">₹{totalCredit.toFixed(2)}</strong></span>
          <span>·</span>
          <span className="font-semibold">
            {isBalanced ? "✓ Balanced & Audited" : `✗ Unbalanced by ₹${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
          </span>
        </div>

        {error && <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-md border border-rose-200 font-medium">{error}</p>}
        {success && <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-md border border-emerald-200 font-medium">{success}</p>}

        <Button type="submit" className="h-9 px-5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle transition-colors" disabled={saving || !isBalanced}>
          {saving ? "Posting Entry..." : "Post Journal Entry"}
        </Button>
      </form>
    </div>
  );
}
