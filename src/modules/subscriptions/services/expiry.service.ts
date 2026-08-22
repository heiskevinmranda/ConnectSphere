import { prisma } from "@/lib/prisma";

export async function expireSubscriptions() {
  const now = new Date();

  const expired = await prisma.subscription.updateMany({
    where: {
      status: "active",
      endDate: { lte: now },
    },
    data: { status: "expired" },
  });

  const deactivated = await prisma.routerAccess.updateMany({
    where: {
      isActive: true,
    },
    data: { isActive: false, deactivatedAt: now },
  });

  return {
    expiredSubscriptions: expired.count,
    deactivatedRouters: deactivated.count,
    timestamp: now.toISOString(),
  };
}
