import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAnalyticAccount,
  listAnalyticAccounts,
  type AnalyticAccount,
} from "@/lib/api/analytic-accounts";

const NEW_VALUE = "__new__";
const NONE_VALUE = "__none__";

interface AnalyticAccountSelectProps {
  value: string;
  onChange: (id: string) => void;
  /** Show a "— None —" option so the tag can be cleared. */
  allowNone?: boolean;
  placeholder?: string;
  triggerClassName?: string;
  id?: string;
}

/**
 * "Budget Analytics" picker used on Purchase Orders, Vendor Bills, Sales Orders and
 * Customer Invoices. Lets the user pick an existing analytic account or create one
 * inline — the created account is selected immediately.
 */
export function AnalyticAccountSelect({
  value,
  onChange,
  allowNone = true,
  placeholder = "Select budget analytic",
  triggerClassName = "h-9 border-slate-200 bg-slate-50 text-xs",
  id,
}: AnalyticAccountSelectProps) {
  const [accounts, setAccounts] = useState<AnalyticAccount[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listAnalyticAccounts().then(setAccounts);
  }, []);

  async function handleCreate() {
    const name = newName.trim();
    if (name === "" || saving) return;
    setSaving(true);
    try {
      const created = await createAnalyticAccount(name);
      setAccounts((prev) =>
        prev.some((a) => a.id === created.id)
          ? prev
          : [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      onChange(created.id);
      setCreating(false);
      setNewName("");
    } finally {
      setSaving(false);
    }
  }

  if (creating) {
    return (
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="New analytic name"
          className="h-9 border-slate-200 bg-white text-xs"
        />
        <Button
          type="button"
          size="sm"
          disabled={saving || newName.trim() === ""}
          onClick={handleCreate}
          className="h-9 bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Add
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setCreating(false);
            setNewName("");
          }}
          className="h-9 border-slate-200 px-3 text-xs"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value === "" ? (allowNone ? NONE_VALUE : "") : value}
      onValueChange={(v) => {
        if (v === NEW_VALUE) {
          setCreating(true);
          return;
        }
        onChange(v === NONE_VALUE ? "" : v);
      }}
    >
      <SelectTrigger id={id} className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border border-slate-200 bg-white shadow-card">
        {allowNone && (
          <SelectItem value={NONE_VALUE} className="text-xs text-slate-500">
            — None —
          </SelectItem>
        )}
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id} className="text-xs text-slate-700">
            {account.name}
          </SelectItem>
        ))}
        <SelectItem value={NEW_VALUE} className="text-xs font-medium text-slate-900">
          + New analytic account
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
