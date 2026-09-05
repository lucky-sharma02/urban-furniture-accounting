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
import { listContacts, type Contact } from "@/lib/api/contacts";
import { listProducts, type Product } from "@/lib/api/products";
import { createPurchaseOrder, type PurchaseOrderLineInput } from "@/lib/api/purchase-orders";

interface PurchaseOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface LineRow extends PurchaseOrderLineInput {
  key: string;
}

function emptyRow(): LineRow {
  return { key: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0 };
}

export function PurchaseOrderFormDialog({ open, onOpenChange, onSaved }: PurchaseOrderFormDialogProps) {
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<LineRow[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      listContacts().then((contacts) => setVendors(contacts.filter((c) => c.type !== "Customer")));
      listProducts().then(setProducts);
      setVendorId("");
      setDate(new Date().toISOString().slice(0, 10));
      setLines([emptyRow()]);
      setError(null);
    }
  }, [open]);

  function updateLine(key: string, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyRow()]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.key !== key)));
  }

  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createPurchaseOrder({
        vendorId,
        date,
        lines: lines.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
      });
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
      <DialogContent className="sm:max-w-2xl bg-white border border-slate-200 shadow-elevated max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-display text-slate-900">
              Create Purchase Order
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vendor" className="text-xs font-semibold text-slate-700">Vendor / Supplier</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger id="vendor" className="h-9 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-card">
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id} className="text-xs text-slate-700">
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date" className="text-xs font-semibold text-slate-700">Order Date</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold font-display text-slate-900 uppercase tracking-wider">Order Line Items</Label>
              </div>

              <div className="grid grid-cols-[1fr_90px_110px_70px] gap-2 px-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>Product Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span />
              </div>

              {lines.map((line) => (
                <div key={line.key} className="grid grid-cols-[1fr_90px_110px_70px] items-center gap-2">
                  <Select value={line.productId} onValueChange={(value) => updateLine(line.key, { productId: value })}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 shadow-card">
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id} className="text-xs text-slate-700">
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Qty"
                    className="h-9 text-xs text-center bg-slate-50 border-slate-200 focus:bg-white tabular-nums"
                    value={line.quantity || ""}
                    onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) || 0 })}
                  />

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="h-9 text-xs text-right bg-slate-50 border-slate-200 focus:bg-white tabular-nums"
                    value={line.unitPrice || ""}
                    onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) || 0 })}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    disabled={lines.length <= 1}
                    onClick={() => removeLine(line.key)}
                  >
                    Delete
                  </Button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200" onClick={addLine}>
                  + Add Line Item
                </Button>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">Estimated Total:</span>
                  <span className="text-sm font-bold font-display text-slate-900 tabular-nums">
                    ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
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
              disabled={saving || !vendorId}
              className="h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle ml-2"
            >
              {saving ? "Creating Order..." : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
