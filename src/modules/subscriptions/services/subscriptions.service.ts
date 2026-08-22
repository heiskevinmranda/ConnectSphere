import { prisma } from "@/lib/prisma";
import { normalizePhone, formatRemainingTime } from "@/lib/utils";

export const subscriptionsService = {
  async checkSubscription(phoneNumber: string) {
    const normalizedPhone = normalizePhone(phoneNumber);

    const subscription = await prisma.subscription.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        status: "active",
        endDate: { gt: new Date() },
      },
    });

    if (subscription) {
      return {
        isSubscribed: true,
        subscription: {
          ...subscription,
          remainingTime: formatRemainingTime(subscription.endDate),
        },
      };
    }

    return { isSubscribed: false, message: "No active subscription found" };
  },

  async getVoucher(phoneNumber: string) {
    const normalizedPhone = normalizePhone(phoneNumber);

    const subscription = await prisma.subscription.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        status: "active",
        endDate: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return { success: false, message: "No active subscription found" };
    }

    if (!subscription.voucherCode) {
      return {
        success: false,
        message: "No voucher code available. Please contact support.",
      };
    }

    return {
      success: true,
      voucher: subscription.voucherCode,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        endDate: subscription.endDate,
        startDate: subscription.startDate,
        amount: subscription.amount,
        routerActivated: subscription.routerActivated,
      },
    };
  },

  async getVoucherStatus() {
    const [availableCount, usedCount, totalCount] = await Promise.all([
      prisma.voucher.count({
        where: { isUsed: false, subscriptionId: null },
      }),
      prisma.voucher.count({ where: { isUsed: true } }),
      prisma.voucher.count(),
    ]);

    return {
      available: availableCount,
      used: usedCount,
      total: totalCount,
      lowStock: availableCount < 10,
    };
  },
};
