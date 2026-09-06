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
import { BudgetWarningNotice } from "@/components/shared/BudgetWarningNotice";
import { listContacts, type Contact } from "@/lib/api/contacts";
import { listProducts, type Product } from "@/lib/api/products";
import { createVendorBill, type VendorBillLineInput } from "@/lib/api/vendor-bills";
import { firstError, isIsoDate } from "@/lib/validation";

interface VendorBillFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface LineRow extends VendorBillLineInput {
  key: string;
}

function emptyRow(): LineRow {
  return { key: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0, analyticAccountId: null };
}

export function VendorBillFormDialog({ open, onOpenChange, onSaved }: VendorBillFormDialogProps) {
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<LineRow[]>([emptyRow()]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      listContacts().then((contacts) => setVendors(contacts.filter((c) => c.type !== "Customer")));
      listProducts().then(setProducts);
      setVendorId("");
      setDate(new Date().toISOString().slice(0, 10));
      setLines([emptyRow()]);
      setWarnings([]);
      setError(null);
    }
  }, [open]);

  function updateLine(key: string, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, emptyRow()]);
  }
  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = firstError([
      [vendorId !== "", "Select a vendor."],
      [isIsoDate(date), "Enter a valid bill date."],
      [lines.every((l) => l.productId !== ""), "Every line item needs a product selected."],
      [lines.every((l) => l.quantity > 0), "Every line quantity must be greater than zero."],
      [lines.every((l) => l.unitPrice >= 0), "Line prices cannot be negative."],
      [total > 0, "The bill total must be greater than zero."],
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const bill = await createVendorBill({
        vendorId,
        date,
        lines: lines.map(({ productId, quantity, unitPrice, analyticAccountId }) => ({
          productId,
          quantity,
          unitPrice,
          analyticAccountId: analyticAccountId || null,
        })),
      });
      onSaved();
      if (bill.budgetWarnings && bill.budgetWarnings.length > 0) {
        setWarnings(bill.budgetWarnings);
      } else {
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border border-slate-200 bg-white shadow-elevated sm:max-w-3xl">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-slate-900">
              New Vendor Bill
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vendor" required className="text-xs font-semibold text-slate-700">
                  Vendor / Supplier
                </Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger id="vendor" className="h-9 border-slate-200 bg-slate-50 text-xs">
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent className="border border-slate-200 bg-white shadow-card">
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id} className="text-xs text-slate-700">
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date" required className="text-xs font-semibold text-slate-700">
                  Bill Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  required
                  className="h-9 border-slate-200 bg-slate-50 text-xs focus:bg-white"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-2">
              <Label required className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
                Bill Line Items
              </Label>

              <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_70px_96px_36px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span>Product Item</span>
                <span>Budget Analytics</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span />
              </div>

              {lines.map((line) => (
                <div
                  key={line.key}
                  className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_70px_96px_36px] items-center gap-2"
                >
                  <Select
                    value={line.productId}
                    onValueChange={(value) => {
                      const product = products.find((p) => p.id === value);
                      updateLine(line.key, {
                        productId: value,
                        unitPrice: product ? product.purchasePrice : 0,
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 border-slate-200 bg-slate-50 text-xs">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent className="border border-slate-200 bg-white shadow-card">
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id} className="text-xs text-slate-700">
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <AnalyticAccountSelect
                    value={line.analyticAccountId ?? ""}
                    onChange={(id) => updateLine(line.key, { analyticAccountId: id || null })}
                  />

                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Qty"
                    className="h-9 border-slate-200 bg-slate-50 text-center text-xs tabular-nums focus:bg-white"
                    value={line.quantity || ""}
                    onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) || 0 })}
                  />

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="h-9 border-slate-200 bg-slate-50 text-right text-xs tabular-nums focus:bg-white"
                    value={line.unitPrice || ""}
                    onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) || 0 })}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-0 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    disabled={lines.length <= 1}
                    onClick={() => removeLine(line.key)}
                    aria-label="Remove line"
                  >
                    ✕
                  </Button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-slate-200 text-xs font-medium"
                  onClick={addLine}
                >
                  + Add Line Item
                </Button>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">Bill Total:</span>
                  <span className="font-display text-sm font-bold tabular-nums text-slate-900">
                    ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <BudgetWarningNotice warnings={warnings} title="Bill recorded — budget notice" />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {warnings.length > 0 ? (
              <Button
                type="button"
                size="sm"
                className="h-9 bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            ) : (
              <>
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
                  disabled={saving || !vendorId}
                  className="ml-2 h-9 bg-slate-900 text-xs font-semibold text-white shadow-subtle hover:bg-slate-800"
                >
                  {saving ? "Saving Bill..." : "Record Bill"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
