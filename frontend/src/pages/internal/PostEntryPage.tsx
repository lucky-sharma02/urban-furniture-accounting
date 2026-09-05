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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Post Journal Entry</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">Accounting Date</Label>
            <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="journal">Journal</Label>
            <Select value={journalId} onValueChange={setJournalId}>
              <SelectTrigger id="journal">
                <SelectValue placeholder="Select a journal" />
              </SelectTrigger>
              <SelectContent>
                {journals.map((journal) => (
                  <SelectItem key={journal.id} value={journal.id}>
                    {journal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_1fr_120px_120px_auto] gap-2 px-1 text-xs font-medium text-muted-foreground">
            <span>Account</span>
            <span>Partner</span>
            <span>Debit</span>
            <span>Credit</span>
            <span />
          </div>

          {lines.map((line) => (
            <div key={line.key} className="grid grid-cols-[1fr_1fr_120px_120px_auto] items-center gap-2">
              <Select value={line.accountId} onValueChange={(value) => updateLine(line.key, { accountId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={line.partnerId ?? "none"}
                onValueChange={(value) => updateLine(line.key, { partnerId: value === "none" ? undefined : value })}
              >
                <SelectTrigger>
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
                value={line.debit || ""}
                onChange={(e) => updateLine(line.key, { debit: Number(e.target.value) || 0 })}
              />

              <Input
                type="number"
                min="0"
                step="0.01"
                value={line.credit || ""}
                onChange={(e) => updateLine(line.key, { credit: Number(e.target.value) || 0 })}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={lines.length <= 2}
                onClick={() => removeLine(line.key)}
              >
                Remove
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addLine}>
            Add Line
          </Button>
        </div>

        <div
          className={cn(
            "w-fit rounded-md border px-3 py-2 text-sm",
            isBalanced
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-destructive/30 bg-destructive/5 text-destructive",
          )}
        >
          Debit: {totalDebit.toFixed(2)} · Credit: {totalCredit.toFixed(2)} ·{" "}
          {isBalanced ? "Balanced" : `Unbalanced by ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <Button type="submit" className="w-fit" disabled={saving || !isBalanced}>
          {saving ? "Posting..." : "Post Entry"}
        </Button>
      </form>
    </div>
  );
}
