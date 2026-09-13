import { prisma } from "@/lib/prisma";
import { getVoucherPriceTiers } from "@/modules/vouchers/services/vouchers.service";
import type {
  NetworkAlert,
  NetworkDeviceItem,
  NetworkOverview,
} from "../types/network.types";

/**
 * Network monitoring backed entirely by database state. There is no
 * fabricated telemetry: figures come from real subscriptions, vouchers,
 * payments and the device inventory. Bandwidth figures are only shown
 * once a router integration supplies them (telemetryConnected).
 */

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function rating(
  a: Omit<NetworkAlert, "id">,
  b: Omit<NetworkAlert, "id">
): number {
  const order: Record<NetworkAlert["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return order[a.severity] - order[b.severity];
}

async function buildAlerts(): Promise<NetworkAlert[]> {
  const alerts: Array<Omit<NetworkAlert, "id">> = [];
  const now = new Date();

  // Voucher stock levels per price tier.
  const tiers = await getVoucherPriceTiers();
  for (const price of tiers) {
    const available = await prisma.voucher.count({
      where: { price, isUsed: false, subscriptionId: null },
    });
    if (available === 0) {
      alerts.push({
        severity: "critical",
        type: "voucher_stock",
        message: `Voucher stock exhausted for TSh ${price.toLocaleString()} - sales will fail for this tier.`,
        device: "Portal",
        timestamp: now.toISOString(),
      });
    } else if (available <= 5) {
      alerts.push({
        severity: "warning",
        type: "voucher_stock",
        message: `Low voucher stock for TSh ${price.toLocaleString()} (${available} remaining).`,
        device: "Portal",
        timestamp: now.toISOString(),
      });
    }
  }

  // Subscriptions expiring within the next 48 hours.
  const expiring = await prisma.subscription.findMany({
    where: {
      status: "active",
      endDate: { gt: now, lte: hoursFromNow(48) },
    },
    orderBy: { endDate: "asc" },
    take: 10,
    select: { phoneNumber: true, plan: true, endDate: true },
  });
  for (const sub of expiring) {
    const hoursLeft = Math.max(
      1,
      Math.floor((sub.endDate.getTime() - now.getTime()) / 3_600_000)
    );
    alerts.push({
      severity: "warning",
      type: "subscription_expiring",
      message: `Subscription ${sub.phoneNumber} (${sub.plan}) expires in ${hoursLeft}h.`,
      device: "Portal",
      timestamp: sub.endDate.toISOString(),
    });
  }

  // Device health from the inventory.
  const devices = await prisma.networkDevice.findMany({
    orderBy: { name: "asc" },
  });
  for (const device of devices) {
    if (!device.isOnline) {
      alerts.push({
        severity: "warning",
        type: "device_offline",
        message: `${device.name} is offline${device.lastSeenAt ? ` (last seen ${device.lastSeenAt.toISOString()})` : " (never observed)"}.`,
        device: device.name,
        timestamp: device.lastSeenAt?.toISOString() ?? now.toISOString(),
      });
    } else if (
      device.lastSeenAt &&
      now.getTime() - device.lastSeenAt.getTime() > 24 * 60 * 60 * 1000
    ) {
      const hours = Math.floor(
        (now.getTime() - device.lastSeenAt.getTime()) / 3_600_000
      );
      alerts.push({
        severity: "warning",
        type: "device_stale_heartbeat",
        message: `${device.name} has not reported telemetry in ${hours}h.`,
        device: device.name,
        timestamp: device.lastSeenAt.toISOString(),
      });
    }
  }
  if (devices.length === 0) {
    alerts.push({
      severity: "info",
      type: "no_devices",
      message:
        "No network devices are registered yet. Add inventory or connect a router integration.",
      device: "Portal",
      timestamp: now.toISOString(),
    });
  }

  // Operational signals: failed payments today.
  const failedToday = await prisma.payment.count({
    where: { status: "failed", updatedAt: { gte: startOfToday() } },
  });
  if (failedToday > 0) {
    alerts.push({
      severity: "info",
      type: "failed_payments",
      message: `${failedToday} failed payment(s) recorded today.`,
      device: "Portal",
      timestamp: now.toISOString(),
    });
  }

  return alerts
    .sort(rating)
    .map((alert, index) => ({ ...alert, id: index + 1 }));
}

export const networkService = {
  async getOverview(): Promise<NetworkOverview> {
    const [
      routers,
      accessPoints,
      activeSubscriptions,
      vouchersAvailable,
      subscriptionsToday,
      tiers,
      alerts,
    ] = await Promise.all([
      prisma.networkDevice.groupBy({
        by: ["type", "isOnline"],
        where: { type: "router" },
        _count: { _all: true },
      }),
      prisma.networkDevice.groupBy({
        by: ["type", "isOnline"],
        where: { type: "access_point" },
        _count: { _all: true },
      }),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.voucher.count({
        where: { isUsed: false, subscriptionId: null },
      }),
      prisma.subscription.count({
        where: { createdAt: { gte: startOfToday() } },
      }),
      getVoucherPriceTiers(),
      buildAlerts(),
    ]);

    const vouchersByTier = await Promise.all(
      tiers.map(async (price) => ({
        price,
        available: await prisma.voucher.count({
          where: { price, isUsed: false, subscriptionId: null },
        }),
      }))
    );

    const countStatus = (
      rows: { isOnline: boolean; _count: { _all: number } }[]
    ) => {
      const online = rows
        .filter((r) => r.isOnline)
        .reduce((sum, r) => sum + r._count._all, 0);
      const offline = rows
        .filter((r) => !r.isOnline)
        .reduce((sum, r) => sum + r._count._all, 0);
      return { total: online + offline, online, offline };
    };

    return {
      routers: countStatus(routers),
      accessPoints: countStatus(accessPoints),
      activeSubscriptions,
      vouchersAvailable,
      vouchersByTier,
      subscriptionsToday,
      activeAlerts: alerts.filter((a) => a.severity !== "info").length,
      telemetryConnected: false,
    };
  },

  async getAlerts(): Promise<NetworkAlert[]> {
    return buildAlerts();
  },

  async getDevices(
    type?: "router" | "access_point"
  ): Promise<NetworkDeviceItem[]> {
    const devices = await prisma.networkDevice.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    return devices.map((device) => ({
      id: device.id,
      name: device.name,
      type: device.type as "router" | "access_point",
      model: device.model,
      ip: device.ip,
      macAddress: device.macAddress,
      serialNumber: device.serialNumber,
      location: device.location,
      firmware: device.firmware,
      status: device.isOnline ? "online" : "offline",
      lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    }));
  },
};