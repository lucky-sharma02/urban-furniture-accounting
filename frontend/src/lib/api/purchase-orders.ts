import type { PurchaseOrderStatus } from "@urban-furniture/shared";
import { apiFetch } from "../api";
import type { VendorBill } from "./vendor-bills";

export interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  refNumber: string;
  vendorId: string;
  date: string;
  status: PurchaseOrderStatus;
  analyticAccountId: string | null;
  analyticAccount?: { id: string; name: string } | null;
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
  analyticAccountId?: string | null;
  lines: PurchaseOrderLineInput[];
}

export function listPurchaseOrders() {
  return apiFetch<PurchaseOrder[]>("/purchase-orders");
}

export function getPurchaseOrder(id: string) {
  return apiFetch<PurchaseOrder & { vendorBills: VendorBill[] }>(`/purchase-orders/${id}`);
}

export function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  return apiFetch<PurchaseOrder & { budgetWarnings?: string[] }>("/purchase-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePurchaseOrder(id: string, input: CreatePurchaseOrderInput) {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function convertPurchaseOrderToBill(id: string) {
  return apiFetch<VendorBill & { budgetWarnings?: string[] }>(
    `/purchase-orders/${id}/convert-to-bill`,
    { method: "POST" },
  );
}
