import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";
import type {
  DashboardStats,
  VoucherAnalytics,
  SubscriptionAnalytics,
} from "../types/dashboard.types";

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    return cache.getOrSet(
      "dashboard-stats",
      async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
          totalVouchers,
          usedVouchers,
          activeSubscriptions,
          expiredSubscriptions,
          totalSubscriptions,
          completedPayments,
          pendingPayments,
          failedPayments,
          totalRevenue,
          recentSubscriptions,
          recentRevenue,
        ] = await Promise.all([
          prisma.voucher.count(),
          prisma.voucher.count({ where: { isUsed: true } }),
          prisma.subscription.count({ where: { status: "active" } }),
          prisma.subscription.count({ where: { status: "expired" } }),
          prisma.subscription.count(),
          prisma.payment.count({ where: { status: "completed" } }),
          prisma.payment.count({ where: { status: "pending" } }),
          prisma.payment.count({ where: { status: "failed" } }),
          prisma.payment.aggregate({
            where: { status: "completed" },
            _sum: { amount: true },
          }),
          prisma.subscription.count({
            where: { createdAt: { gte: thirtyDaysAgo } },
          }),
          prisma.payment.aggregate({
            where: {
              status: "completed",
              createdAt: { gte: thirtyDaysAgo },
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          vouchers: {
            total: totalVouchers,
            used: usedVouchers,
            remaining: totalVouchers - usedVouchers,
            usagePercentage:
              totalVouchers > 0
                ? Math.round((usedVouchers / totalVouchers) * 100)
                : 0,
          },
          subscriptions: {
            active: activeSubscriptions,
            expired: expiredSubscriptions,
            total: totalSubscriptions,
          },
          payments: {
            completed: completedPayments,
            pending: pendingPayments,
            failed: failedPayments,
            totalRevenue: totalRevenue._sum.amount || 0,
          },
          recent: {
            subscriptions: recentSubscriptions,
            revenue: recentRevenue._sum.amount || 0,
          },
        };
      },
      120
    );
  },

  async getVoucherAnalytics(): Promise<VoucherAnalytics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [voucherUsageByDay, planDistribution, voucherDistribution, usageByPrice, monthlyRevenue] =
      await Promise.all([
        prisma.voucher.groupBy({
          by: ["updatedAt"],
          where: { isUsed: true, updatedAt: { gte: thirtyDaysAgo } },
          _count: true,
        }),
        prisma.subscription.groupBy({
          by: ["plan"],
          _count: { plan: true },
        }),
        prisma.voucher.groupBy({
          by: ["price"],
          _count: true,
        }),
        prisma.voucher.groupBy({
          by: ["price"],
          where: { isUsed: true },
          _count: true,
        }),
        prisma.payment.groupBy({
          by: ["createdAt"],
          where: {
            status: "completed",
            createdAt: { gte: twelveMonthsAgo },
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    return {
      voucherUsageByDay: voucherUsageByDay.map((v) => ({
        date: v.updatedAt.toISOString().split("T")[0],
        count: v._count,
      })),
      planDistribution: planDistribution.map((p) => ({
        plan: p.plan,
        count: p._count.plan,
      })),
      voucherDistribution: voucherDistribution.map((v) => ({
        price: v.price,
        total: v._count,
        available: 0,
        used: 0,
      })),
      usageByPrice: usageByPrice.map((v) => ({
        price: v.price,
        count: v._count,
      })),
      monthlyRevenue: monthlyRevenue.map((m) => ({
        month: m.createdAt.toISOString().substring(0, 7),
        revenue: m._sum.amount || 0,
        transactions: m._count,
      })),
    };
  },

  async getSubscriptionAnalytics(): Promise<SubscriptionAnalytics> {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const [statusDistribution, expiringSoon] = await Promise.all([
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.subscription.count({
        where: {
          status: "active",
          endDate: { lte: sevenDaysFromNow },
        },
      }),
    ]);

    return {
      statusDistribution: statusDistribution.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      expiringSoon,
      averageDuration: 0,
    };
  },
};
