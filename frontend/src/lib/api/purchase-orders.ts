import type { PurchaseOrderStatus } from "@urban-furniture/shared";
import { apiFetch } from "../api";

export interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  date: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseOrderInput {
  vendorId: string;
  date: string;
  lines: PurchaseOrderLineInput[];
}

export function listPurchaseOrders() {
  return apiFetch<PurchaseOrder[]>("/purchase-orders");
}

export function getPurchaseOrder(id: string) {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}`);
}

export function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  return apiFetch<PurchaseOrder>("/purchase-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
