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
    return cache.getOrSet(
      "voucher-analytics",
      async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const [
          usedVouchers30d,
          planDistribution,
          voucherDistribution,
          usageByPrice,
          completedPayments12m,
          newSubscriptions12m,
        ] = await Promise.all([
          prisma.voucher.findMany({
            where: { isUsed: true, updatedAt: { gte: thirtyDaysAgo } },
            select: { updatedAt: true },
          }),
          prisma.subscription.groupBy({
            by: ["plan"],
            _count: { plan: true },
          }),
          prisma.voucher.groupBy({
            by: ["price"],
            _count: { price: true },
          }),
          prisma.voucher.groupBy({
            by: ["price"],
            where: { isUsed: true },
            _count: { price: true },
          }),
          prisma.payment.findMany({
            where: {
              status: "completed",
              createdAt: { gte: twelveMonthsAgo },
            },
            select: { createdAt: true, amount: true },
          }),
          prisma.subscription.findMany({
            where: { createdAt: { gte: twelveMonthsAgo } },
            select: { createdAt: true },
          }),
        ]);

        // Bucket voucher redemptions by calendar day.
        const usageByDayMap = new Map<string, number>();
        for (const v of usedVouchers30d) {
          const day = v.updatedAt.toISOString().split("T")[0];
          usageByDayMap.set(day, (usageByDayMap.get(day) ?? 0) + 1);
        }
        const voucherUsageByDay = Array.from(usageByDayMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const distributionByPrice = new Map(
          voucherDistribution.map((v) => [
            v.price,
            { total: v._count.price, available: 0, used: 0 },
          ])
        );
        for (const entry of usageByPrice) {
          const dist = distributionByPrice.get(entry.price);
          if (dist) {
            dist.used = entry._count.price;
            dist.available = dist.total - dist.used;
          }
        }

        // Bucket revenue and subscriber growth by calendar month.
        const monthlyRevenueMap = new Map<
          string,
          { revenue: number; transactions: number }
        >();
        for (const p of completedPayments12m) {
          const month = p.createdAt.toISOString().substring(0, 7);
          const entry = monthlyRevenueMap.get(month) ?? {
            revenue: 0,
            transactions: 0,
          };
          entry.revenue += p.amount;
          entry.transactions += 1;
          monthlyRevenueMap.set(month, entry);
        }
        const monthlyRevenue = Array.from(monthlyRevenueMap.entries())
          .map(([month, v]) => ({ month, ...v }))
          .sort((a, b) => a.month.localeCompare(b.month));

        const growthMap = new Map<string, number>();
        for (const s of newSubscriptions12m) {
          const month = s.createdAt.toISOString().substring(0, 7);
          growthMap.set(month, (growthMap.get(month) ?? 0) + 1);
        }
        const subscriberGrowth = Array.from(growthMap.entries())
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => a.month.localeCompare(b.month));

        return {
          voucherUsageByDay,
          planDistribution: planDistribution.map((p) => ({
            plan: p.plan,
            count: p._count.plan,
          })),
          voucherDistribution: Array.from(
            distributionByPrice.entries()
          ).map(([price, v]) => ({ price, ...v })),
          usageByPrice: usageByPrice.map((v) => ({
            price: v.price,
            count: v._count.price,
          })),
          monthlyRevenue,
          subscriberGrowth,
        };
      },
      120
    );
  },

  async getSubscriptionAnalytics(): Promise<SubscriptionAnalytics> {
    return cache.getOrSet(
      "subscription-analytics",
      async () => {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const [statusDistribution, expiringSoon, planCounts] =
          await Promise.all([
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
            prisma.subscription.groupBy({
              by: ["plan"],
              _count: { plan: true },
            }),
          ]);

        // Average subscription length, weighted by plan popularity.
        const plans = await prisma.plan.findMany({
          select: { slug: true, duration: true },
        });
        const durationByPlan = new Map(plans.map((p) => [p.slug, p.duration]));

        let weightedTotal = 0;
        let totalCounted = 0;
        for (const pc of planCounts) {
          const duration = durationByPlan.get(pc.plan);
          if (duration !== undefined) {
            weightedTotal += duration * pc._count.plan;
            totalCounted += pc._count.plan;
          }
        }
        const averageDuration =
          totalCounted > 0
            ? Math.round((weightedTotal / totalCounted) * 10) / 10
            : 0;

        return {
          statusDistribution: statusDistribution.map((s) => ({
            status: s.status,
            count: s._count.status,
          })),
          expiringSoon,
          averageDuration,
        };
      },
      120
    );
  },
};
