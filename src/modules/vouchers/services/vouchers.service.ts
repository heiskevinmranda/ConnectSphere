import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";

export const vouchersService = {
  async upload(
    vouchers: Array<string | { code: string; price: number }>
  ): Promise<{ insertedCount: number; message: string }> {
    const validVouchers = vouchers.filter((item) => {
      if (typeof item === "string") return /^\d{10}$/.test(item);
      if (typeof item === "object" && item.code && item.price) {
        return (
          /^\d{10}$/.test(item.code) &&
          [1000, 2000, 5000, 10000, 20000].includes(item.price)
        );
      }
      return false;
    });

    if (validVouchers.length === 0) {
      throw new Error("No valid voucher codes found");
    }

    const codes = validVouchers.map((item) =>
      typeof item === "string" ? item : item.code
    );

    const existingVouchers = await prisma.voucher.findMany({
      where: { code: { in: codes } },
    });
    const existingCodes = new Set(existingVouchers.map((v) => v.code));

    const newVouchers = validVouchers.filter((item) => {
      const code = typeof item === "string" ? item : item.code;
      return !existingCodes.has(code);
    });

    if (newVouchers.length === 0) {
      throw new Error("All voucher codes already exist");
    }

    let insertedCount = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < newVouchers.length; i += BATCH_SIZE) {
      const batch = newVouchers.slice(i, i + BATCH_SIZE);
      const result = await prisma.voucher.createMany({
        data: batch.map((item) => ({
          code: typeof item === "string" ? item : item.code,
          price: typeof item === "string" ? 1000 : item.price,
          isUsed: false,
        })),
      });
      insertedCount += result.count;
    }

    cache.delete("dashboard-stats");
    cache.delete("voucher-analytics");

    return {
      insertedCount,
      message: `Successfully uploaded ${insertedCount} new vouchers`,
    };
  },

  async generate(
    count: number,
    price: number
  ): Promise<{ generated: number; message: string }> {
    const BATCH_SIZE = 500;
    let totalCreated = 0;

    for (let i = 0; i < count; i += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, count - i);
      const vouchers = Array.from({ length: batchSize }, () => ({
        code: crypto
          .randomBytes(5)
          .toString("hex")
          .toUpperCase()
          .substring(0, 10),
        price,
        isUsed: false,
      }));

      const result = await prisma.voucher.createMany({
        data: vouchers,
      });
      totalCreated += result.count;
    }

    cache.delete("dashboard-stats");

    return {
      generated: totalCreated,
      message: `Generated ${totalCreated} voucher codes for TSh ${price.toLocaleString()}`,
    };
  },

  async list() {
    return prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  },
};
