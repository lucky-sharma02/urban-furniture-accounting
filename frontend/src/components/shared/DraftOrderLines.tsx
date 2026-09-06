import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnalyticAccountSelect } from "@/components/shared/AnalyticAccountSelect";
import { listContacts, type Contact } from "@/lib/api/contacts";
import { listProducts, type Product } from "@/lib/api/products";

export interface EditableLine {
  key: string;
  id?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  analyticAccountId: string | null;
}

export interface DraftOrderSnapshot {
  partnerId: string;
  date: string;
  lines: { productId: string; quantity: number; unitPrice: number; analyticAccountId: string | null }[];
}

interface DraftOrderLinesProps {
  kind: "purchase" | "sales";
  initialPartnerId: string;
  initialDate: string;
  initialLines: EditableLine[];
  /** Persist the whole document. Returns the saved lines so ids can re-sync. */
  onSave: (snapshot: DraftOrderSnapshot) => Promise<{ lines: { id: string; productId: string }[] }>;
  /** Called after a successful save so the parent can refresh header figures. */
  onSaved: () => void;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function emptyLine(): EditableLine {
  return { key: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0, analyticAccountId: null };
}

/**
 * Inline editor for the line items of a still-Draft Purchase / Sales Order. Every
 * field edits in place and auto-saves on blur / change through the order's PUT
 * endpoint (which replaces the document wholesale — Draft only).
 */
export function DraftOrderLines({
  kind,
  initialPartnerId,
  initialDate,
  initialLines,
  onSave,
  onSaved,
}: DraftOrderLinesProps) {
  const [partners, setPartners] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [partnerId, setPartnerId] = useState(initialPartnerId);
  const [date, setDate] = useState(initialDate);
  const [lines, setLines] = useState<EditableLine[]>(
    initialLines.length > 0 ? initialLines : [emptyLine()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Latest state, so a blur handler fired right after a setState still saves fresh data.
  const latest = useRef({ partnerId, date, lines });
  latest.current = { partnerId, date, lines };

  useEffect(() => {
    const wantVendor = kind === "purchase";
    listContacts().then((cs) =>
      setPartners(cs.filter((c) => (wantVendor ? c.type !== "Customer" : c.type !== "Vendor"))),
    );
    listProducts().then(setProducts);
  }, [kind]);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
    [lines],
  );

  async function commit() {
    const { partnerId: p, date: d, lines: ls } = latest.current;
    const complete = ls.filter((l) => l.productId !== "" && l.quantity > 0 && l.unitPrice >= 0);
    if (p === "" || complete.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const res = await onSave({
        partnerId: p,
        date: d,
        lines: complete.map(({ productId, quantity, unitPrice, analyticAccountId }) => ({
          productId,
          quantity,
          unitPrice,
          analyticAccountId,
        })),
      });
      // Re-sync server ids onto the matching rows so a later save updates, not duplicates.
      setLines((prev) => {
        const pool = [...res.lines];
        return prev.map((row) => {
          if (row.productId === "") return row;
          const i = pool.findIndex((s) => s.productId === row.productId);
          if (i === -1) return row;
          const [match] = pool.splice(i, 1);
          return { ...row, id: match.id };
        });
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the change");
    } finally {
      setSaving(false);
    }
  }

  function updateLine(key: string, patch: Partial<EditableLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }
  function removeLine(key: string) {
    setLines((prev) => {
      const next = prev.length <= 1 ? [emptyLine()] : prev.filter((l) => l.key !== key);
      latest.current = { ...latest.current, lines: next };
      return next;
    });
    void commit();
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {kind === "purchase" ? "Vendor" : "Customer"}
          </span>
          <Select
            value={partnerId}
            onValueChange={(v) => {
              setPartnerId(v);
              latest.current = { ...latest.current, partnerId: v };
              void commit();
            }}
          >
            <SelectTrigger className="h-9 border-slate-200 bg-slate-50 text-xs">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="border border-slate-200 bg-white shadow-card">
              {partners.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs text-slate-700">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Order Date</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={commit}
            className="h-9 border-slate-200 bg-slate-50 text-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-card">
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_70px_100px_92px_32px] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Product</span>
          <span>Budget Analytics</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Unit Price</span>
          <span className="text-right">Line</span>
          <span />
        </div>
        {lines.map((line) => (
          <div
            key={line.key}
            className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_70px_100px_92px_32px] items-center gap-2 px-3 py-1.5"
          >
            <Select
              value={line.productId}
              onValueChange={(v) => {
                const product = products.find((p) => p.id === v);
                const price =
                  kind === "purchase" ? product?.purchasePrice ?? 0 : product?.salesPrice ?? 0;
                updateLine(line.key, { productId: v, unitPrice: price });
                latest.current = {
                  ...latest.current,
                  lines: latest.current.lines.map((l) =>
                    l.key === line.key ? { ...l, productId: v, unitPrice: price } : l,
                  ),
                };
                void commit();
              }}
            >
              <SelectTrigger className="h-8 border-slate-200 bg-white text-xs">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="border border-slate-200 bg-white shadow-card">
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs text-slate-700">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AnalyticAccountSelect
              value={line.analyticAccountId ?? ""}
              triggerClassName="h-8 border-slate-200 bg-white text-xs"
              onChange={(id) => {
                updateLine(line.key, { analyticAccountId: id || null });
                latest.current = {
                  ...latest.current,
                  lines: latest.current.lines.map((l) =>
                    l.key === line.key ? { ...l, analyticAccountId: id || null } : l,
                  ),
                };
                void commit();
              }}
            />

            <Input
              type="number"
              min="1"
              step="1"
              value={line.quantity || ""}
              onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) || 0 })}
              onBlur={commit}
              className="h-8 border-slate-200 bg-white text-center text-xs tabular-nums"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={line.unitPrice || ""}
              onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) || 0 })}
              onBlur={commit}
              className="h-8 border-slate-200 bg-white text-right text-xs tabular-nums"
            />
            <span className="text-right text-xs font-semibold tabular-nums text-slate-900">
              {inr(line.quantity * line.unitPrice)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-0 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => removeLine(line.key)}
              aria-label="Remove line"
            >
              ✕
            </Button>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-slate-200 text-xs font-medium"
            onClick={addLine}
          >
            + Add line
          </Button>
          <span className="text-xs text-slate-500">
            Total <span className="font-display font-bold tabular-nums text-slate-900">{inr(total)}</span>
          </span>
        </div>
      </div>

      <div className="flex h-4 items-center gap-2 text-[11px]">
        {saving && <span className="text-slate-400">Saving…</span>}
        {error && <span className="text-rose-600">{error}</span>}
        {!saving && !error && <span className="text-slate-400">Changes save automatically</span>}
      </div>
    </div>
  );
}
