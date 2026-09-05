import type { DocumentStatus } from "@urban-furniture/shared";
import { apiFetch } from "../api";

export interface Payment {
  id: string;
  vendorBillId: string;
  amount: number;
  date: string;
  paymentAccountId: string;
  createdAt: string;
}

export interface VendorBill {
  id: string;
  purchaseOrderId: string | null;
  vendorId: string;
  date: string;
  amount: number;
  amountDue: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorBillInput {
  vendorId: string;
  date: string;
  amount: number;
}

export interface RecordPaymentInput {
  amount: number;
  date: string;
  paymentAccountId: string;
}

export function listVendorBills() {
  return apiFetch<VendorBill[]>("/vendor-bills");
}

export function getVendorBill(id: string) {
  return apiFetch<VendorBill & { payments: Payment[] }>(`/vendor-bills/${id}`);
}

export function createVendorBill(input: CreateVendorBillInput) {
  return apiFetch<VendorBill>("/vendor-bills", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function recordVendorBillPayment(billId: string, input: RecordPaymentInput) {
  return apiFetch<{ payment: Payment; vendorBill: VendorBill }>(`/vendor-bills/${billId}/payments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
