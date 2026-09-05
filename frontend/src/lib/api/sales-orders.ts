import type { SalesOrderStatus } from "@urban-furniture/shared";
import { apiFetch } from "../api";
import type { CustomerInvoice } from "./customer-invoices";

export interface SalesOrderLine {
  id: string;
  salesOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesOrder {
  id: string;
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
  return apiFetch<SalesOrder>(`/sales-orders/${id}`);
}

export function createSalesOrder(input: CreateSalesOrderInput) {
  return apiFetch<SalesOrder>("/sales-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function generateInvoiceFromSalesOrder(id: string) {
  return apiFetch<CustomerInvoice>(`/sales-orders/${id}/generate-invoice`, { method: "POST" });
}
