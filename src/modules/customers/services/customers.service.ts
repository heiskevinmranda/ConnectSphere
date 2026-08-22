import { prisma } from "@/lib/prisma";
import type { CustomerUser, CustomerListResponse } from "../types/customers.types";

export const customersService = {
  async list(params: {
    status?: string;
    plan?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<CustomerListResponse> {
    const { status, plan, search, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    const subscriptionWhere: Record<string, unknown> = {};
    if (status && status !== "all") subscriptionWhere.status = status;
    if (plan && plan !== "all") subscriptionWhere.plan = plan;
    if (search) {
      subscriptionWhere.phoneNumber = { contains: search };
    }

    const pendingWhere: Record<string, unknown> = { status: "pending" };
    if (search) {
      pendingWhere.phoneNumber = { contains: search };
    }

    const [totalSubscriptions, subscriptions, pendingPayments] = await Promise.all([
      prisma.subscription.count({ where: subscriptionWhere }),
      prisma.subscription.findMany({
        where: subscriptionWhere,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.payment.findMany({
        where: pendingWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const users: CustomerUser[] = subscriptions.map((sub) => ({
      id: sub.id,
      phoneNumber: sub.phoneNumber,
      plan: sub.plan,
      status: sub.status,
      amount: sub.amount,
      startDate: sub.startDate,
      endDate: sub.endDate,
      voucherCode: sub.voucherCode,
      createdAt: sub.createdAt,
      type: "subscription" as const,
    }));

    const pendingUsers: CustomerUser[] = pendingPayments.map((payment) => ({
      id: payment.id,
      phoneNumber: payment.phoneNumber,
      plan: payment.plan,
      status: "pending_payment",
      amount: payment.amount,
      startDate: null,
      endDate: null,
      voucherCode: null,
      createdAt: payment.createdAt,
      type: "pending_payment" as const,
      paymentReference: payment.paymentReference,
    }));

    const allUsers = [...users, ...pendingUsers].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = totalSubscriptions + pendingUsers.length;

    return {
      data: allUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async deleteSubscription(id: number) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
    });
    if (!subscription) return false;
    await prisma.subscription.delete({ where: { id } });
    return true;
  },

  async deletePayment(id: number) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return false;
    await prisma.payment.delete({ where: { id } });
    return true;
  },
};
