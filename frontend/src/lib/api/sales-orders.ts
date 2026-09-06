import type { SalesOrderStatus } from "@urban-furniture/shared";
import { apiFetch } from "../api";
import type { CustomerInvoice } from "./customer-invoices";

export interface SalesOrderLine {
  id: string;
  salesOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  analyticAccountId: string | null;
  analyticAccount?: { id: string; name: string } | null;
}

export interface SalesOrder {
  id: string;
  refNumber: string;
  customerId: string;
  date: string;
  status: SalesOrderStatus;
  lines: SalesOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrderLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  analyticAccountId?: string | null;
}

export interface CreateSalesOrderInput {
  customerId: string;
  date: string;
  lines: SalesOrderLineInput[];
}

export function listSalesOrders() {
  return apiFetch<SalesOrder[]>("/sales-orders");
}

export function getSalesOrder(id: string) {
  return apiFetch<SalesOrder & { invoices: CustomerInvoice[] }>(`/sales-orders/${id}`);
}

export function createSalesOrder(input: CreateSalesOrderInput) {
  return apiFetch<SalesOrder & { budgetWarnings?: string[] }>("/sales-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSalesOrder(id: string, input: CreateSalesOrderInput) {
  return apiFetch<SalesOrder>(`/sales-orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function generateInvoiceFromSalesOrder(id: string) {
  return apiFetch<CustomerInvoice & { budgetWarnings?: string[] }>(
    `/sales-orders/${id}/generate-invoice`,
    { method: "POST" },
  );
}
