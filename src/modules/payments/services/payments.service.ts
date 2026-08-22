import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";
import { PLAN_DURATIONS } from "@/lib/utils";
import { azampayService } from "./azampay.service";
import { routerAccessService } from "@/modules/network/services/router-access.service";
import type { VoucherAvailability } from "../types/payments.types";
import type { Prisma } from "@prisma/client";

export const paymentsService = {
  async checkVoucherAvailability(
    price?: number
  ): Promise<VoucherAvailability> {
    const cacheKey = price
      ? `voucher-availability-${price}`
      : "voucher-availability";

    return cache.getOrSet(
      cacheKey,
      async () => {
        const whereClause = price ? { price } : {};
        const availableWhereClause = price
          ? { isUsed: false, subscriptionId: null, price }
          : { isUsed: false, subscriptionId: null };

        const [availableCount, totalCount] = await Promise.all([
          prisma.voucher.count({ where: availableWhereClause }),
          prisma.voucher.count({ where: whereClause }),
        ]);

        const usedCount = totalCount - availableCount;
        const isAvailable = availableCount > 0;
        const isLowStock = availableCount <= 10 && availableCount > 0;

        let status: "available" | "unavailable" | "low_stock" = "available";
        let message = price
          ? `Voucher codes are available for TSh ${price.toLocaleString()}.`
          : "Voucher codes are available for purchase.";

        if (!isAvailable) {
          status = "unavailable";
          message = price
            ? `No voucher codes available for TSh ${price.toLocaleString()}.`
            : "Service temporarily unavailable. No voucher codes available.";
        } else if (isLowStock) {
          status = "low_stock";
          message = price
            ? `Limited voucher codes available for TSh ${price.toLocaleString()} (${availableCount} remaining).`
            : `Limited voucher codes available (${availableCount} remaining).`;
        }

        return {
          available: availableCount,
          total: totalCount,
          used: usedCount,
          isAvailable,
          isLowStock,
          status,
          message,
        };
      },
      30
    );
  },

  async initiatePayment(phoneNumber: string, plan: string, amount: number) {
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        phoneNumber,
        status: "active",
        endDate: { gt: new Date() },
      },
    });

    if (existingSubscription) {
      const remainingTime = getRemainingTime(existingSubscription.endDate);
      return {
        success: false,
        hasActiveSubscription: true,
        message: `You already have an active ${existingSubscription.plan} plan with voucher code: ${existingSubscription.voucherCode}. Your subscription has ${remainingTime} remaining.`,
        existingSubscription: {
          plan: existingSubscription.plan,
          endDate: existingSubscription.endDate,
          remainingTime,
          voucherCode: existingSubscription.voucherCode,
          amount: existingSubscription.amount,
          status: existingSubscription.status,
          startDate: existingSubscription.startDate,
        },
      };
    }

    const existingPayment = await prisma.payment.findFirst({
      where: { phoneNumber, status: "pending" },
      orderBy: { createdAt: "desc" },
    });

    if (existingPayment) {
      const minutesOld = Math.floor(
        (Date.now() - new Date(existingPayment.createdAt).getTime()) /
          (1000 * 60)
      );
      return {
        success: true,
        message: `You have a pending payment initiated ${minutesOld} minutes ago.`,
        data: {
          paymentReference: existingPayment.paymentReference,
          amount: existingPayment.amount,
          plan: existingPayment.plan,
          status: existingPayment.status,
          createdAt: existingPayment.createdAt,
        },
      };
    }

    const payment = await prisma.payment.create({
      data: {
        phoneNumber,
        plan,
        amount,
        paymentReference: azampayService.generateReference(),
      },
    });

    try {
      const azampayResponse = await azampayService.initiatePayment({
        phoneNumber,
        plan,
        amount,
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          azampayTransactionId: azampayResponse.transactionId,
          azampayResponse: JSON.stringify(azampayResponse.data),
        },
      });

      return {
        success: true,
        message: "Payment initiated successfully",
        paymentReference: payment.paymentReference,
        transactionId: azampayResponse.transactionId,
      };
    } catch {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          azampayTransactionId: `SIM_${payment.paymentReference}`,
          azampayResponse: JSON.stringify({ simulationMode: true }),
        },
      });

      return {
        success: true,
        message: "Payment initiated successfully (simulation mode)",
        paymentReference: payment.paymentReference,
        simulationMode: true,
        transactionId: `SIM_${payment.paymentReference}`,
      };
    }
  },

  async checkPaymentStatus(reference: string) {
    const payment = await prisma.payment.findUnique({
      where: { paymentReference: reference },
    });

    if (!payment) {
      return { success: false, message: "Payment reference not found." };
    }

    if (payment.status === "pending" && payment.azampayTransactionId) {
      try {
        const azampayStatus = await azampayService.checkPaymentStatus(
          payment.azampayTransactionId
        );
        if (azampayStatus.success && azampayStatus.status === "SUCCESSFUL") {
          await processSuccessfulPayment(payment.id);
        } else if (azampayStatus.status === "FAILED") {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "failed" },
          });
        }
      } catch {
        if (process.env.NODE_ENV === "development") {
          const age = Date.now() - new Date(payment.createdAt).getTime();
          if (age > 30000 && payment.status === "pending") {
            await processSuccessfulPayment(payment.id);
          }
        }
      }
    }

    const updated = await prisma.payment.findUnique({
      where: { id: payment.id },
    });

    let subscription = null;
    if (updated?.subscriptionId) {
      subscription = await prisma.subscription.findUnique({
        where: { id: updated.subscriptionId },
      });
    }

    return {
      success: true,
      payment: {
        reference: updated!.paymentReference,
        status: updated!.status,
        amount: updated!.amount,
        plan: updated!.plan,
        phoneNumber: updated!.phoneNumber,
        createdAt: updated!.createdAt,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            voucherCode: subscription.voucherCode,
            amount: subscription.amount,
          }
        : undefined,
      message:
        updated!.status === "completed"
          ? "Payment completed successfully! Your internet subscription is now active."
          : undefined,
    };
  },
};

async function processSuccessfulPayment(paymentId: number) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "pending") return;

  const planDuration = PLAN_DURATIONS[payment.plan];
  if (!planDuration) throw new Error(`Invalid plan: ${payment.plan}`);

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "completed" },
    });

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planDuration);

    const voucher = await tx.voucher.findFirst({
      where: {
        isUsed: false,
        subscriptionId: null,
        price: payment.amount,
      },
      orderBy: { id: "asc" },
    });

    if (!voucher) {
      throw new Error("No voucher codes available");
    }

    const subscription = await tx.subscription.create({
      data: {
        phoneNumber: payment.phoneNumber,
        plan: payment.plan,
        amount: payment.amount,
        startDate: new Date(),
        endDate,
        paymentReference: payment.paymentReference,
        azampayTransactionId: payment.azampayTransactionId,
        status: "active",
        routerActivated: false,
        voucherCode: voucher.code,
      },
    });

    await tx.voucher.update({
      where: { id: voucher.id },
      data: { isUsed: true, subscriptionId: subscription.id },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: { subscriptionId: subscription.id },
    });
  });

  cache.delete("voucher-availability");
  cache.delete("dashboard-stats");
  if (payment.amount) {
    cache.delete(`voucher-availability-${payment.amount}`);
  }

  try {
    await routerAccessService.activateUser(payment.phoneNumber, payment.plan);
  } catch {
    // Router activation is non-critical
  }
}

function getRemainingTime(endDate: Date): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  if (days > 1) return `${days} days`;
  if (hours > 1) return `${hours} hours`;
  return "Less than 1 hour";
}
