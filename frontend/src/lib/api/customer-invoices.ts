import type { DocumentStatus } from "@urban-furniture/shared";
import { apiFetch } from "../api";

export interface Payment {
  id: string;
  refNumber: string;
  customerInvoiceId: string;
  amount: number;
  date: string;
  paymentAccountId: string;
  paymentAccount?: { name: string };
  createdAt: string;
}

export interface CustomerInvoiceLine {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  analyticAccountId: string | null;
  analyticAccount?: { id: string; name: string } | null;
  product?: { name: string };
}

export interface CustomerInvoice {
  id: string;
  refNumber: string;
  salesOrderId: string | null;
  salesOrder?: { id: string; refNumber: string } | null;
  customerId: string;
  date: string;
  baseAmount: number;
  taxAmount: number;
  amount: number;
  amountDue: number;
  status: DocumentStatus;
  lines: CustomerInvoiceLine[];
  budgetWarnings?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecordPaymentInput {
  amount: number;
  date: string;
  paymentAccountId: string;
}

export function listCustomerInvoices() {
  return apiFetch<CustomerInvoice[]>("/customer-invoices");
}

export function getCustomerInvoice(id: string) {
  return apiFetch<CustomerInvoice & { payments: Payment[] }>(`/customer-invoices/${id}`);
}

export function recordCustomerInvoicePayment(invoiceId: string, input: RecordPaymentInput) {
  return apiFetch<{ payment: Payment; customerInvoice: CustomerInvoice }>(
    `/customer-invoices/${invoiceId}/payments`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
