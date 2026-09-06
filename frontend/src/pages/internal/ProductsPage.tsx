import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductFormDialog } from "@/components/master-data/ProductFormDialog";
import { archiveProduct, listProducts, type Product } from "@/lib/api/products";
import { Plus, LayoutGrid, List, Edit, Archive, Package, Tag } from "lucide-react";

type ViewMode = "grid" | "list";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  async function load() {
    setLoading(true);
    try {
      const data = await listProducts();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleArchive(id: string) {
    if (confirm("Are you sure you want to archive this product?")) {
      await archiveProduct(id);
      load();
    }
  }

  function openCreateForm() {
    setEditingProduct(undefined);
    setFormOpen(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <SearchBar onSearch={setSearch} placeholder="Search products by name or category — press Enter" />

        {/* View Switcher & Action */}
        <div className="flex items-center gap-2">
          {/* Category Pills */}
          {categories.length > 0 && (
            <div className="hidden lg:flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory("ALL")}
                className={`h-7 text-xs px-2.5 transition-all ${
                  selectedCategory === "ALL"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Categories
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-7 text-xs px-2.5 transition-all ${
                    selectedCategory === cat
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}

          {/* Grid / List Switch */}
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("grid")}
              className={`h-7 px-2.5 transition-all ${
                view === "grid"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("list")}
              className={`h-7 px-2.5 transition-all ${
                view === "list"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Table List View"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* New Product Button */}
          <Button onClick={openCreateForm} size="sm" className="h-9 gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle">
            <Plus className="h-3.5 w-3.5" />
            <span>New Product</span>
          </Button>
        </div>
      </div>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSaved={load}
      />

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading products catalog...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-dashed border-slate-200 bg-white shadow-card">
          <Package className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-900">No products found</p>
          <p className="text-xs text-slate-500 mt-1">Add your furniture items to track prices, procurement costs and estimated margins.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const margin =
              product.salesPrice > 0
                ? (((product.salesPrice - product.purchasePrice) / product.salesPrice) * 100).toFixed(1)
                : "0.0";
            return (
              <div
                key={product.id}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-card hover:shadow-card-hover transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                      <Tag className="h-2.5 w-2.5 text-slate-400" />
                      {product.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {product.id.slice(-6)}</span>
                  </div>

                  <h3 className="font-semibold text-sm text-slate-900 mt-3 leading-snug font-display">{product.name}</h3>

                  <div className="mt-4 p-3 rounded-md bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Sales Price:</span>
                      <span className="font-bold text-slate-900 tabular-nums">₹{product.salesPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Cost Price:</span>
                      <span className="tabular-nums text-slate-600">₹{product.purchasePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
                      <span className="text-slate-500">Est. Margin:</span>
                      <span className="tabular-nums font-semibold text-emerald-700 px-1 py-0.2 rounded bg-emerald-50 border border-emerald-200">{margin}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-1 mt-4 pt-3 border-t border-slate-100">
                  <Button variant="ghost" size="sm" onClick={() => openEditForm(product)} className="h-7 text-xs px-2 text-slate-700 hover:bg-slate-100">
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleArchive(product.id)} className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50">
                    <Archive className="h-3 w-3 mr-1" /> Archive
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table List View */
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-card">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200">
                <TableHead className="text-xs font-semibold text-slate-700">Product Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Type</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Category</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Sales Price</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Cost Price</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Profit Margin</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const margin =
                  product.salesPrice > 0
                    ? (((product.salesPrice - product.purchasePrice) / product.salesPrice) * 100).toFixed(1)
                    : "0.0";
                return (
                  <TableRow key={product.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-xs text-slate-900">{product.name}</TableCell>
                    <TableCell className="text-xs text-slate-600">{product.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 font-medium">
                        {product.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-xs text-slate-900 tabular-nums">
                      ₹{product.salesPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500 tabular-nums">
                      ₹{product.purchasePrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-emerald-700 font-semibold tabular-nums">
                      {margin}%
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditForm(product)} className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-100">
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleArchive(product.id)} className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50">
                          <Archive className="h-3 w-3 mr-1" /> Archive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

