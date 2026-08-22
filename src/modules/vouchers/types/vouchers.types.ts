export interface Voucher {
  id: number;
  code: string;
  price: number;
  isUsed: boolean;
  subscriptionId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoucherUploadInput {
  vouchers: Array<string | { code: string; price: number }>;
}

export interface VoucherGenerateInput {
  count: number;
  price: number;
}
