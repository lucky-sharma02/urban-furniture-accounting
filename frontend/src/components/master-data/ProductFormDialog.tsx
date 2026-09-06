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
import { ImageUpload } from "@/components/shared/ImageUpload";
import { createProduct, updateProduct, type Product } from "@/lib/api/products";
import type { ProductType } from "@urban-furniture/shared";
import { firstError, isAmount, isNonEmpty } from "@/lib/validation";

const PRODUCT_TYPES: ProductType[] = ["Goods", "Service", "Combo"];

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSaved: () => void;
}

const emptyForm = { name: "", category: "", type: "Goods" as ProductType, salesPrice: "", purchasePrice: "" };

export function ProductFormDialog({ open, onOpenChange, product, onSaved }: ProductFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name,
              category: product.category,
              type: product.type,
              salesPrice: String(product.salesPrice),
              purchasePrice: String(product.purchasePrice),
            }
          : emptyForm,
      );
      setImageDataUrl(product?.imageDataUrl ?? null);
      setError(null);
    }
  }, [open, product]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = firstError([
      [isNonEmpty(form.name), "Product name is required."],
      [isNonEmpty(form.category), "Category is required."],
      [isAmount(form.salesPrice), "Sales price must be a number like 1200 or 1200.50."],
      [isAmount(form.purchasePrice), "Purchase cost must be a number like 1200 or 1200.50."],
      [Number(form.salesPrice) > 0, "Sales price must be greater than zero."],
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const input = {
        name: form.name,
        category: form.category,
        type: form.type,
        imageDataUrl,
        salesPrice: Number(form.salesPrice),
        purchasePrice: Number(form.purchasePrice),
      };
      if (product) {
        await updateProduct(product.id, input);
      } else {
        await createProduct(input);
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
      <DialogContent className="sm:max-w-lg bg-white border border-slate-200 shadow-elevated">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-display text-slate-900">
              {product ? "Edit Furniture SKU / Item" : "New Furniture Product"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col-reverse gap-4 py-4 sm:flex-row">
          <div className="flex flex-1 flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" required className="text-xs font-semibold text-slate-700">Product Name / Design</Label>
              <Input
                id="name"
                required
                placeholder="e.g. Ergonomic Solid Oak Armchair"
                className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="type" required className="text-xs font-semibold text-slate-700">Product Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as ProductType })}
                >
                  <SelectTrigger id="type" className="h-9 border-slate-200 bg-slate-50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border border-slate-200 bg-white shadow-card">
                    {PRODUCT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category" required className="text-xs font-semibold text-slate-700">Category</Label>
                <Input
                  id="category"
                  required
                  placeholder="e.g. Seating, Tables"
                  className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="salesPrice" required className="text-xs font-semibold text-slate-700">Sales Price (₹)</Label>
                <Input
                  id="salesPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white tabular-nums"
                  value={form.salesPrice}
                  onChange={(e) => setForm({ ...form, salesPrice: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="purchasePrice" required className="text-xs font-semibold text-slate-700">Purchase Cost (₹)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white tabular-nums"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-slate-700">Product Image</Label>
            <ImageUpload value={imageDataUrl} onChange={setImageDataUrl} />
          </div>
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
              {saving ? "Saving..." : product ? "Update Product" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
