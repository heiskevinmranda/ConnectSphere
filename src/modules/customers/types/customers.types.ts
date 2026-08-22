export interface CustomerUser {
  id: number;
  phoneNumber: string;
  plan: string;
  status: string;
  amount: number;
  startDate: Date | null;
  endDate: Date | null;
  voucherCode: string | null;
  createdAt: Date;
  type: "subscription" | "pending_payment";
  paymentReference?: string;
}

export interface CustomerListResponse {
  data: CustomerUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
