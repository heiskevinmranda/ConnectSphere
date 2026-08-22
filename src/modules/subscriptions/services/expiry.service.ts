import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";

/**
 * Expires subscriptions whose end date has passed and deactivates router
 * access for customers who no longer hold an active subscription.
 */
export async function expireSubscriptions() {
  const now = new Date();

  const expired = await prisma.subscription.updateMany({
    where: {
      status: "active",
      endDate: { lte: now },
    },
    data: { status: "expired" },
  });

  // Deactivate only the access rows whose owner has no active
  // subscription left (renewals keep their access).
  const activeAccess = await prisma.routerAccess.findMany({
    where: { isActive: true },
    select: { id: true, phoneNumber: true },
  });

  const activePhones = await prisma.subscription.findMany({
    where: {
      status: "active",
      endDate: { gt: now },
      phoneNumber: { in: activeAccess.map((a) => a.phoneNumber) },
    },
    select: { phoneNumber: true },
  });
  const stillActive = new Set(activePhones.map((s) => s.phoneNumber));

  const toDeactivate = activeAccess
    .filter((a) => !stillActive.has(a.phoneNumber))
    .map((a) => a.id);

  let deactivatedCount = 0;
  if (toDeactivate.length > 0) {
    const result = await prisma.routerAccess.updateMany({
      where: { id: { in: toDeactivate } },
      data: { isActive: false, deactivatedAt: now },
    });
    deactivatedCount = result.count;
  }

  if (expired.count > 0 || deactivatedCount > 0) {
    cache.delete("dashboard-stats");
    cache.delete("subscription-analytics");
  }

  return {
    expiredSubscriptions: expired.count,
    deactivatedRouters: deactivatedCount,
    timestamp: now.toISOString(),
  };
}
