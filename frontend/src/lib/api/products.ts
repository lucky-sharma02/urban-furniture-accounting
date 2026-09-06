import type { ProductType } from "@urban-furniture/shared";
import { apiFetch } from "../api";

export interface Product {
  id: string;
  refNumber: string;
  name: string;
  category: string;
  type: ProductType;
  imageDataUrl: string | null;
  salesPrice: number;
  purchasePrice: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  category: string;
  type: ProductType;
  imageDataUrl?: string | null;
  salesPrice: number;
  purchasePrice: number;
}

export function listProducts(includeArchived = false) {
  return apiFetch<Product[]>(`/products${includeArchived ? "?includeArchived=true" : ""}`);
}

export function createProduct(input: ProductInput) {
  return apiFetch<Product>("/products", { method: "POST", body: JSON.stringify(input) });
}

export function updateProduct(id: string, input: Partial<ProductInput>) {
  return apiFetch<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function archiveProduct(id: string) {
  return apiFetch<Product>(`/products/${id}/archive`, { method: "PATCH" });
}
