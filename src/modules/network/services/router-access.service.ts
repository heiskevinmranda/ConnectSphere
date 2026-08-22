import { prisma } from "@/lib/prisma";

const ROUTER_MAC = process.env.ROUTER_MAC_ADDRESS || "00:1A:2B:3C:4D:5E";
const ROUTER_SERIAL = process.env.ROUTER_SERIAL_NUMBER || "1234567890";
const ROUTER_IMEI = process.env.ROUTER_IMEI || "123456789012345";

export const routerAccessService = {
  async activateUser(phoneNumber: string, plan: string) {
    const existing = await prisma.routerAccess.findUnique({
      where: { phoneNumber },
    });

    if (existing) {
      await prisma.routerAccess.update({
        where: { phoneNumber },
        data: {
          isActive: true,
          plan,
          activatedAt: new Date(),
          deactivatedAt: null,
        },
      });
    } else {
      await prisma.routerAccess.create({
        data: {
          phoneNumber,
          routerMacAddress: ROUTER_MAC,
          routerSerialNumber: ROUTER_SERIAL,
          routerImei: ROUTER_IMEI,
          plan,
          isActive: true,
          activatedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      message: `User ${phoneNumber} activated on router ${ROUTER_MAC}`,
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
      message: `User ${phoneNumber} deactivated on router ${ROUTER_MAC}`,
    };
  },

  async checkAccess(phoneNumber: string, macAddress?: string, imei?: string) {
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

    if (macAddress && macAddress !== ROUTER_MAC) {
      return { success: false, message: "Invalid router MAC address" };
    }
    if (imei && imei !== ROUTER_IMEI) {
      return { success: false, message: "Invalid router IMEI" };
    }

    return { success: true, message: "Access granted", plan: subscription.plan };
  },
};
