import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/errors";
import type { CustomerUser, CustomerListResponse } from "../types/customers.types";

export const CUSTOMER_STATUSES = [
  "all",
  "active",
  "expired",
  "cancelled",
  "pending_payment",
] as const;

type ListParams = {
  status?: string;
  plan?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export const customersService = {
  /**
   * Lists customers as a single merged, globally-ordered feed of
   * subscriptions and pending payments. Both tables are indexed on the
   * filter columns; Prisma has no UNION so ordering/paging happens over
   * lightweight id+date rows before hydrating one page.
   */
  async list(params: ListParams): Promise<CustomerListResponse> {
    const {
      status = "all",
      plan,
      search,
      page = 1,
      limit = 20,
    } = params;
    const offset = (page - 1) * limit;

    const includeSubs = status !== "pending_payment";
    const includePending = status === "all" || status === "pending_payment";

    const subWhere: Record<string, unknown> = {};
    if (includeSubs && status !== "all") subWhere.status = status;
    if (plan) subWhere.plan = plan;
    if (search) subWhere.phoneNumber = { contains: search };

    const payWhere: Record<string, unknown> = { status: "pending" };
    if (plan) payWhere.plan = plan;
    if (search) payWhere.phoneNumber = { contains: search };

    type IndexRow = { id: number; createdAt: Date; kind: "sub" | "pay" };

    const [subIndex, payIndex] = await Promise.all([
      includeSubs
        ? prisma.subscription.findMany({
            where: subWhere,
            select: { id: true, createdAt: true },
          })
        : Promise.resolve([] as Array<{ id: number; createdAt: Date }>),
      includePending
        ? prisma.payment.findMany({
            where: payWhere,
            select: { id: true, createdAt: true },
          })
        : Promise.resolve([] as Array<{ id: number; createdAt: Date }>),
    ]);

    const merged: IndexRow[] = [
      ...subIndex.map((r): IndexRow => ({ ...r, kind: "sub" })),
      ...payIndex.map((r): IndexRow => ({ ...r, kind: "pay" })),
    ].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    const total = merged.length;
    const pageItems = merged.slice(offset, offset + limit);

    const subIds = pageItems.filter((i) => i.kind === "sub").map((i) => i.id);
    const payIds = pageItems.filter((i) => i.kind === "pay").map((i) => i.id);

    const [subs, pays] = await Promise.all([
      subIds.length
        ? prisma.subscription.findMany({ where: { id: { in: subIds } } })
        : Promise.resolve([]),
      payIds.length
        ? prisma.payment.findMany({ where: { id: { in: payIds } } })
        : Promise.resolve([]),
    ]);

    const subById = new Map(subs.map((s) => [s.id, s]));
    const payById = new Map(pays.map((p) => [p.id, p]));

    const data: CustomerUser[] = pageItems.flatMap((item): CustomerUser[] => {
      if (item.kind === "sub") {
        const sub = subById.get(item.id);
        if (!sub) return [];
        return [
          {
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
          },
        ];
      }
      const payment = payById.get(item.id);
      if (!payment) return [];
      return [
        {
          id: payment.id,
          phoneNumber: payment.phoneNumber,
          plan: payment.plan,
          status: "pending_payment" as const,
          amount: payment.amount,
          startDate: null,
          endDate: null,
          voucherCode: null,
          createdAt: payment.createdAt,
          type: "pending_payment" as const,
          paymentReference: payment.paymentReference,
        },
      ];
    });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  /** All filtered rows for CSV export, fetched in bounded pages. */
  async exportRows(params: ListParams): Promise<CustomerUser[]> {
    const rows: CustomerUser[] = [];
    const pageSize = 500;
    let page = 1;
    for (;;) {
      const result = await this.list({ ...params, page, limit: pageSize });
      rows.push(...result.data);
      if (page >= result.pagination.totalPages || result.data.length === 0) {
        break;
      }
      page += 1;
    }
    return rows;
  },

  /**
   * Cancels an active subscription (business-safe alternative to
   * deletion): marks it cancelled and revokes router access.
   */
  async cancelSubscription(id: number) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
    });
    if (!subscription) return null;
    if (subscription.status !== "active") {
      throw new ServiceError("Only active subscriptions can be cancelled", 409);
    }

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id },
        data: { status: "cancelled", routerActivated: false },
      });
      await tx.routerAccess.updateMany({
        where: { phoneNumber: subscription.phoneNumber, isActive: true },
        data: { isActive: false, deactivatedAt: new Date() },
      });
    });

    return subscription;
  },

  /** Permanently removes a non-active subscription record (admin cleanup). */
  async deleteSubscription(id: number) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
    });
    if (!subscription) return null;
    if (subscription.status === "active") {
      throw new ServiceError(
        "Active subscriptions must be cancelled instead of deleted",
        409
      );
    }
    await prisma.subscription.delete({ where: { id } });
    return subscription;
  },

  /**
   * Removes a payment record. Completed payments are financial records
   * and cannot be deleted; stale pending/failed entries can be cleaned up.
   */
  async deletePayment(id: number) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return null;
    if (payment.status === "completed") {
      throw new ServiceError(
        "Completed payments are financial records and cannot be deleted",
        409
      );
    }
    await prisma.payment.delete({ where: { id } });
    return payment;
  },
};
