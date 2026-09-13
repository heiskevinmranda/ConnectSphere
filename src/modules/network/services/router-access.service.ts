import { prisma } from "@/lib/prisma";

/**
 * Router identity is required to grant hardware-gated access. Without it
 * the portal fails closed: no device can claim access, so ambient
 * "anyone knows the MAC" fallbacks are never trusted in production.
 */
function getRouterConfig() {
  const mac = process.env.ROUTER_MAC_ADDRESS;
  const serial = process.env.ROUTER_SERIAL_NUMBER;
  const imei = process.env.ROUTER_IMEI;
  if (!mac || !serial || !imei) return null;
  return { mac, serial, imei };
}

export const routerAccessService = {
  async activateUser(phoneNumber: string, plan: string) {
    const router = getRouterConfig();
    const previous = await prisma.routerAccess.findUnique({
      where: { phoneNumber },
    });
    await prisma.$transaction(async (tx) => {
      await tx.routerAccess.upsert({
        where: { phoneNumber },
        create: {
          phoneNumber,
          routerMacAddress: router?.mac,
          routerSerialNumber: router?.serial,
          routerImei: router?.imei,
          plan,
          isActive: true,
          activatedAt: new Date(),
        },
        update: {
          isActive: true,
          plan,
          activatedAt: new Date(),
          deactivatedAt: null,
          routerMacAddress: router?.mac ?? previous?.routerMacAddress,
          routerSerialNumber:
            router?.serial ?? previous?.routerSerialNumber,
          routerImei: router?.imei ?? previous?.routerImei,
        },
      });
    });

    return {
      success: true,
      message: `User ${phoneNumber} activated on router ${router?.mac ?? "unconfigured"}`,
    };
  },

  async deactivateUser(phoneNumber: string) {
    const access = await prisma.routerAccess.findUnique({
      where: { phoneNumber },
    });

    if (access && access.isActive) {
      await prisma.routerAccess.update({
        where: { phoneNumber },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      message: `User ${phoneNumber} deactivated`,
    };
  },

  async checkAccess(phoneNumber: string, macAddress?: string, imei?: string) {
    const router = getRouterConfig();
    if (!router) {
      return {
        success: false,
        message:
          "Router identity is not configured. Contact the operator.",
      };
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        phoneNumber,
        status: "active",
        endDate: { gt: new Date() },
      },
    });

    if (!subscription) {
      return { success: false, message: "No active subscription" };
    }

    const access = await prisma.routerAccess.findUnique({
      where: { phoneNumber },
    });

    if (!access || !access.isActive) {
      return { success: false, message: "Router access not activated" };
    }

    if (macAddress && macAddress !== router.mac) {
      return { success: false, message: "Invalid router MAC address" };
    }
    if (imei && imei !== router.imei) {
      return { success: false, message: "Invalid router IMEI" };
    }

    return { success: true, message: "Access granted", plan: subscription.plan };
  },
};
