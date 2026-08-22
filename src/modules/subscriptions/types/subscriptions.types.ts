export interface Subscription {
  id: number;
  phoneNumber: string;
  plan: string;
  amount: number;
  status: "active" | "expired" | "cancelled";
  startDate: Date;
  endDate: Date;
  routerActivated: boolean;
  voucherCode: string | null;
  paymentReference: string;
  azampayTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionCheckResult {
  isSubscribed: boolean;
  subscription?: Subscription & { remainingTime: string };
  message?: string;
}
