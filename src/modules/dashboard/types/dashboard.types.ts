export interface DashboardStats {
  vouchers: {
    total: number;
    used: number;
    remaining: number;
    usagePercentage: number;
  };
  subscriptions: {
    active: number;
    expired: number;
    total: number;
  };
  payments: {
    completed: number;
    pending: number;
    failed: number;
    totalRevenue: number;
  };
  recent: {
    subscriptions: number;
    revenue: number;
  };
}

export interface VoucherAnalytics {
  voucherUsageByDay: Array<{ date: string; count: number }>;
  planDistribution: Array<{ plan: string; count: number }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    transactions: number;
  }>;
  voucherDistribution: Array<{
    price: number;
    total: number;
    available: number;
    used: number;
  }>;
  usageByPrice: Array<{ price: number; count: number }>;
}

export interface SubscriptionAnalytics {
  statusDistribution: Array<{ status: string; count: number }>;
  expiringSoon: number;
  averageDuration: number;
}
