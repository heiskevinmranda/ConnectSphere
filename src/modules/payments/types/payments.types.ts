export interface Payment {
  id: number;
  phoneNumber: string;
  amount: number;
  plan: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  paymentReference: string;
  azampayTransactionId: string | null;
  azampayResponse: Record<string, unknown> | null;
  subscriptionId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInitiateInput {
  phoneNumber: string;
  plan: string;
  amount: number;
}

export interface VoucherAvailability {
  available: number;
  total: number;
  used: number;
  isAvailable: boolean;
  isLowStock: boolean;
  status: "available" | "unavailable" | "low_stock";
  message: string;
}
