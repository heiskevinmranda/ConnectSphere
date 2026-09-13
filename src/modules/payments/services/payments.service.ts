import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";
import { recordAudit } from "@/lib/audit";
import { formatRemainingTime } from "@/lib/utils";
import { azampayService } from "./azampay.service";
import { routerAccessService } from "@/modules/network/services/router-access.service";
import { vouchersService } from "@/modules/vouchers/services/vouchers.service";
import type { VoucherAvailability } from "../types/payments.types";

const PENDING_PAYMENT_TTL_MS = 30 * 60 * 1000; // pending payments expire after 30 min

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

  /**
   * Initiates a payment for a plan. The amount and duration are always
   * derived from the Plan table server-side; client input only selects
   * the plan.
   */
  async initiatePayment(phoneNumber: string, planSlug: string) {
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan || !plan.isActive) {
      return {
        success: false as const,
        code: "PLAN_NOT_FOUND" as const,
        message: "The selected plan is not available.",
      };
    }

    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        phoneNumber,
        status: "active",
        endDate: { gt: new Date() },
      },
      orderBy: { endDate: "desc" },
    });

    if (existingSubscription) {
      return {
        success: false as const,
        code: "ACTIVE_SUBSCRIPTION" as const,
        message: `You already have an active ${existingSubscription.plan} plan with voucher code: ${existingSubscription.voucherCode}. Your subscription has ${formatRemainingTime(existingSubscription.endDate)} remaining.`,
        existingSubscription: {
          plan: existingSubscription.plan,
          endDate: existingSubscription.endDate,
          remainingTime: formatRemainingTime(existingSubscription.endDate),
          voucherCode: existingSubscription.voucherCode,
          amount: existingSubscription.amount,
          status: existingSubscription.status,
          startDate: existingSubscription.startDate,
        },
      };
    }

    // Refuse early when there is no voucher stock for this price tier so
    // customers are never charged for a plan we cannot fulfil.
    const availability = await paymentsService.checkVoucherAvailability(plan.price);
    if (!availability.isAvailable) {
      return {
        success: false as const,
        code: "OUT_OF_STOCK" as const,
        message: `We are temporarily out of voucher codes for the ${plan.name} plan. Please try again shortly.`,
      };
    }

    // Expire stale pending payments, then look for one still worth reusing.
    await prisma.payment.updateMany({
      where: {
        phoneNumber,
        status: "pending",
        createdAt: { lt: new Date(Date.now() - PENDING_PAYMENT_TTL_MS) },
      },
      data: { status: "failed" },
    });

    const existingPayment = await prisma.payment.findFirst({
      where: { phoneNumber, status: "pending", plan: plan.slug },
      orderBy: { createdAt: "desc" },
    });

    if (existingPayment) {
      return {
        success: true as const,
        reused: true as const,
        message: "You already have a payment in progress for this plan.",
        data: {
          paymentReference: existingPayment.paymentReference,
          amount: existingPayment.amount,
          plan: existingPayment.plan,
          status: existingPayment.status,
          createdAt: existingPayment.createdAt,
        },
      };
    }

    // A pending payment for a *different* plan is superseded by this one.
    await prisma.payment.updateMany({
      where: { phoneNumber, status: "pending", plan: { not: plan.slug } },
      data: { status: "failed" },
    });

    const payment = await prisma.payment.create({
      data: {
        phoneNumber,
        plan: plan.slug,
        amount: plan.price,
        paymentReference: azampayService.generateReference(),
      },
    });

    // Collapse any concurrent duplicates into this payment so a customer
    // never ends up with two pending charges for the same plan.
    await prisma.payment.deleteMany({
      where: {
        phoneNumber,
        plan: plan.slug,
        status: "pending",
        id: { not: payment.id },
      },
    });

    try {
      const azampayResponse = await azampayService.initiatePayment({
        phoneNumber,
        plan: plan.name,
        amount: plan.price,
        reference: payment.paymentReference,
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          azampayTransactionId: azampayResponse.transactionId,
          azampayResponse: JSON.stringify(azampayResponse.data),
        },
      });

      return {
        success: true as const,
        message: "Payment initiated successfully",
        data: {
          paymentReference: payment.paymentReference,
          transactionId: azampayResponse.transactionId,
          simulationMode: false,
        },
      };
    } catch (error) {
      // In development the provider may be unreachable or unconfigured:
      // fall back to simulation mode so the flow stays testable. In
      // production a failed checkout must never be reported as success,
      // otherwise customers believe they were charged when they were not.
      const isDev = process.env.NODE_ENV !== "production";

      if (isDev) {
        console.warn(
          "[payments] AzamPay unavailable, using simulation mode:",
          error instanceof Error ? error.message : error
        );

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            azampayTransactionId: `SIM_${payment.paymentReference}`,
            azampayResponse: JSON.stringify({ simulationMode: true }),
          },
        });

        return {
          success: true as const,
          message: "Payment initiated successfully (simulation mode)",
          data: {
            paymentReference: payment.paymentReference,
            simulationMode: true,
          },
        };
      }

      console.error(
        "[payments] AzamPay checkout failed in production:",
        error instanceof Error ? error.message : error
      );
      await markPaymentFailed(payment.id, "provider_unavailable");
      return {
        success: false as const,
        code: "PROVIDER_UNAVAILABLE" as const,
        message:
          "We could not start your payment right now. Please try again in a moment.",
      };
    }
  },

  async checkPaymentStatus(reference: string) {
    let payment = await prisma.payment.findUnique({
      where: { paymentReference: reference },
    });

    if (!payment) {
      return { success: false as const, message: "Payment reference not found." };
    }

    if (
      payment.status === "pending" &&
      payment.azampayTransactionId &&
      !payment.azampayTransactionId.startsWith("SIM_")
    ) {
      try {
        // The provider's statuscheck identifies transactions by the
        // merchant reference (the externalId we sent at checkout), not
        // by the provider-assigned transaction id.
        const azampayStatus = await azampayService.checkPaymentStatus(
          payment.paymentReference
        );
        if (azampayStatus.success && azampayStatus.status === "SUCCESSFUL") {
          await processSuccessfulPayment(payment.id);
        } else if (azampayStatus.status === "FAILED") {
          await markPaymentFailed(payment.id, "provider_reported_failed");
        }
      } catch (error) {
        console.warn(
          "[payments] provider status check failed:",
          error instanceof Error ? error.message : error
        );
      }
    } else if (
      payment.status === "pending" &&
      Date.now() - new Date(payment.createdAt).getTime() > PENDING_PAYMENT_TTL_MS
    ) {
      await markPaymentFailed(payment.id, "expired");
    }

    payment = await prisma.payment.findUnique({
      where: { id: payment.id },
    });
    if (!payment) {
      return { success: false as const, message: "Payment reference not found." };
    }

    const subscription = payment.subscriptionId
      ? await prisma.subscription.findUnique({
          where: { id: payment.subscriptionId },
        })
      : null;

    return {
      success: true as const,
      payment: {
        reference: payment.paymentReference,
        status: payment.status,
        amount: payment.amount,
        plan: payment.plan,
        phoneNumber: payment.phoneNumber,
        createdAt: payment.createdAt,
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
        payment.status === "completed"
          ? "Payment completed successfully! Your internet subscription is now active."
          : undefined,
    };
  },

  /** Marks a payment completed and provisions the subscription. Idempotent. */
  async completePendingPayment(paymentId: number): Promise<boolean> {
    return processSuccessfulPayment(paymentId);
  },
};

async function processSuccessfulPayment(paymentId: number): Promise<boolean> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "pending") return false;

  const plan = await prisma.plan.findUnique({ where: { slug: payment.plan } });
  if (!plan) throw new Error(`Unknown plan: ${payment.plan}`);

  try {
    await prisma.$transaction(async (tx) => {
      const claimedVoucher = await vouchersService.claimVoucher(
        tx,
        payment!.amount
      );
      if (!claimedVoucher) {
        throw new Error("NO_VOUCHER_STOCK");
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration);

      const subscription = await tx.subscription.create({
        data: {
          phoneNumber: payment!.phoneNumber,
          plan: payment!.plan,
          amount: payment!.amount,
          startDate: new Date(),
          endDate,
          paymentReference: payment!.paymentReference,
          azampayTransactionId: payment!.azampayTransactionId,
          status: "active",
          routerActivated: false,
          voucherCode: claimedVoucher.code,
        },
      });

      await tx.voucher.update({
        where: { id: claimedVoucher.id },
        data: { subscriptionId: subscription.id },
      });

      await tx.payment.update({
        where: { id: payment!.id },
        data: { status: "completed", subscriptionId: subscription.id },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_VOUCHER_STOCK") {
      // The customer WAS charged by the provider but we cannot fulfil
      // the order. Mark the payment failed and surface a refund request
      // in the logs so an operator can reconcile it with the provider.
      await prisma.payment.updateMany({
        where: { id: payment!.id, status: "pending" },
        data: { status: "failed" },
      });
      await recordAudit({
        actor: payment!.phoneNumber,
        actorType: "customer",
        action: "payment.completed_no_stock",
        target: payment!.paymentReference,
        details: {
          paymentId: payment!.id,
          plan: payment!.plan,
          amount: payment!.amount,
          requiresRefund: true,
        },
        status: "failure",
      });
      console.error(
        `[payments] REFUND REQUIRED: customer ${payment!.phoneNumber} was charged ` +
          `${payment!.amount} TZS (payment #${payment!.id}, ` +
          `${payment!.paymentReference}) but no voucher was available. ` +
          `Reconcile and refund via the AzamPay portal.`
      );
      invalidatePaymentCaches();
      return false;
    }
    throw error;
  }

  invalidatePaymentCaches();

  await recordAudit({
    actor: payment.phoneNumber,
    actorType: "customer",
    action: "payment.completed",
    target: payment.paymentReference,
    details: {
      paymentId: payment.id,
      plan: payment.plan,
      amount: payment.amount,
    },
  });

  try {
    const activation = await routerAccessService.activateUser(
      payment.phoneNumber,
      payment.plan
    );
    if (activation.success) {
      await prisma.subscription.updateMany({
        where: { paymentReference: payment.paymentReference },
        data: { routerActivated: true },
      });
    }
  } catch (error) {
    console.error(
      "[payments] router activation failed (non-critical):",
      error instanceof Error ? error.message : error
    );
  }

  return true;
}

async function markPaymentFailed(paymentId: number, reason: string) {
  const updated = await prisma.payment.updateMany({
    where: { id: paymentId, status: "pending" },
    data: { status: "failed" },
  });
  if (updated.count === 1) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });
    await recordAudit({
      actor: payment?.phoneNumber ?? "system",
      actorType: "customer",
      action: "payment.failed",
      target: payment?.paymentReference ?? String(paymentId),
      details: { reason },
    });
    invalidatePaymentCaches();
  }
}

function invalidatePaymentCaches() {
  cache.delete("dashboard-stats");
  cache.delete("voucher-analytics");
  // Provisioning a subscription changes the subscription analytics too.
  cache.delete("subscription-analytics");
  for (const key of cache.keys()) {
    if (key.startsWith("voucher-availability")) cache.delete(key);
  }
}
