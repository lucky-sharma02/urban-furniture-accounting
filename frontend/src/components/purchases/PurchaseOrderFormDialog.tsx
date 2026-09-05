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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vendor">Vendor</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger id="vendor">
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-[1fr_100px_120px_auto] gap-2 px-1 text-xs font-medium text-muted-foreground">
                <span>Product</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span />
              </div>

              {lines.map((line) => (
                <div key={line.key} className="grid grid-cols-[1fr_100px_120px_auto] items-center gap-2">
                  <Select value={line.productId} onValueChange={(value) => updateLine(line.key, { productId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity || ""}
                    onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) || 0 })}
                  />

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice || ""}
                    onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) || 0 })}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={lines.length <= 1}
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

            <p className="text-sm font-medium">Total: {total.toFixed(2)}</p>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving || !vendorId}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
