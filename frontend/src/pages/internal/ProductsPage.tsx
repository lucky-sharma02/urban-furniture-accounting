import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductFormDialog } from "@/components/master-data/ProductFormDialog";
import { archiveProduct, listProducts, type Product } from "@/lib/api/products";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  async function load() {
    setLoading(true);
    const data = await listProducts();
    setProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleArchive(id: string) {
    await archiveProduct(id);
    load();
  }

  function openCreateForm() {
    setEditingProduct(undefined);
    setFormOpen(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button onClick={openCreateForm}>New Product</Button>
      </div>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSaved={load}
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-muted-foreground">No products yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Sales Price</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{product.category}</Badge>
                </TableCell>
                <TableCell>{product.salesPrice.toFixed(2)}</TableCell>
                <TableCell>{product.purchasePrice.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEditForm(product)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleArchive(product.id)}>
                    Archive
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
