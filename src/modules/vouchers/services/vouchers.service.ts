import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";
import { ServiceError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

export const VOUCHER_PRICE_TIERS = [1000, 2000, 5000, 10000, 20000] as const;
export type VoucherPriceTier = (typeof VOUCHER_PRICE_TIERS)[number];

export function isValidVoucherPrice(price: number): price is VoucherPriceTier {
  return (VOUCHER_PRICE_TIERS as readonly number[]).includes(price);
}

/**
 * Price tiers that can hold voucher stock: every price ever used by a
 * plan plus the default tiers. Derived from the DB so dynamically
 * created plans work end-to-end.
 */
export async function getVoucherPriceTiers(): Promise<number[]> {
  const planPrices = await prisma.plan.findMany({
    select: { price: true },
    distinct: ["price"],
  });
  const set = new Set<number>([
    ...VOUCHER_PRICE_TIERS,
    ...planPrices.map((p) => p.price),
  ]);
  return Array.from(set).sort((a, b) => a - b);
}

function isAllowedPrice(price: number, tiers: number[]): boolean {
  return tiers.includes(price);
}

export const vouchersService = {
  /**
   * Claims an available voucher for the given price inside the caller's
   * transaction. Uses a guarded conditional update instead of
   * find-then-update so two concurrent payments can never claim the
   * same voucher.
   *
   * Returns the claimed voucher code, or null when stock is exhausted.
   */
  async claimVoucher(
    tx: Prisma.TransactionClient,
    price: number,
    attempts = 5
  ): Promise<{ code: string; id: number } | null> {
    const candidates = await tx.voucher.findMany({
      where: { isUsed: false, subscriptionId: null, price },
      orderBy: { id: "asc" },
      take: attempts,
      select: { id: true },
    });

    for (const candidate of candidates) {
      const claimed = await tx.voucher.updateMany({
        where: {
          id: candidate.id,
          isUsed: false,
          subscriptionId: null,
        },
        data: { isUsed: true },
      });
      if (claimed.count === 1) {
        const voucher = await tx.voucher.findUniqueOrThrow({
          where: { id: candidate.id },
          select: { id: true, code: true },
        });
        return voucher;
      }
    }
    return null;
  },

  async upload(
    vouchers: Array<string | { code: string; price: number }>
  ): Promise<{ insertedCount: number; skippedCount: number; message: string }> {
    const tiers = await getVoucherPriceTiers();

    const invalidPrices = vouchers.filter(
      (item) => typeof item === "object" && !isAllowedPrice(item.price, tiers)
    );
    if (invalidPrices.length > 0) {
      throw new ServiceError(
        `Invalid price tier. Allowed prices (TSh): ${tiers.join(", ")}`,
        400
      );
    }

    const validVouchers = vouchers.filter((item) => {
      if (typeof item === "string") return /^\d{10}$/.test(item);
      if (typeof item === "object" && item.code && item.price) {
        return /^\d{10}$/.test(item.code) && isAllowedPrice(item.price, tiers);
      }
      return false;
    });

    if (validVouchers.length === 0) {
      throw new ServiceError("No valid voucher codes found", 400);
    }

    const codes = validVouchers.map((item) =>
      typeof item === "string" ? item : item.code
    );

    const existingVouchers = await prisma.voucher.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    });
    const existingCodes = new Set(existingVouchers.map((v) => v.code));

    const newVouchers = validVouchers.filter((item) => {
      const code = typeof item === "string" ? item : item.code;
      return !existingCodes.has(code);
    });

    // Drop duplicates that appear multiple times within a single upload.
    const deduped = new Map<string, { code: string; price: number }>();
    for (const item of newVouchers) {
      const code = typeof item === "string" ? item : item.code;
      if (!deduped.has(code)) {
        deduped.set(code, {
          code,
          price: typeof item === "string" ? tiers[0] : item.price,
        });
      }
    }
    const newVouchersUnique = Array.from(deduped.values());

    if (newVouchersUnique.length === 0) {
      throw new ServiceError(
        "All voucher codes already exist, or no new codes were provided.",
        409
      );
    }

    let insertedCount = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < newVouchersUnique.length; i += BATCH_SIZE) {
      const batch = newVouchersUnique.slice(i, i + BATCH_SIZE);
      const result = await prisma.voucher.createMany({
        data: batch.map((item) => ({
          code: item.code,
          price: item.price,
          isUsed: false,
        })),
      });
      insertedCount += result.count;
    }

    invalidateVoucherCaches();

    return {
      insertedCount,
      skippedCount: vouchers.length - insertedCount,
      message: `Successfully uploaded ${insertedCount} new vouchers`,
    };
  },

  async generate(
    count: number,
    price: number
  ): Promise<{ generated: number; message: string }> {
    const tiers = await getVoucherPriceTiers();
    if (!isAllowedPrice(price, tiers)) {
      throw new ServiceError(
        `Invalid price tier. Allowed prices (TSh): ${tiers.join(", ")}`,
        400
      );
    }

    const BATCH_SIZE = 500;
    let totalCreated = 0;

    try {
      for (let i = 0; i < count; i += BATCH_SIZE) {
        const batchSize = Math.min(BATCH_SIZE, count - i);
        const codes = await buildUniqueCodes(batchSize);
        if (codes.length === 0) break;

        const result = await prisma.voucher.createMany({
          data: codes.map((code) => ({
            code,
            price,
            isUsed: false,
          })),
        });
        totalCreated += result.count;
      }
    } catch (error) {
      // A concurrent generation could still race a unique constraint.
      // Surface that as a retryable client error instead of a 500.
      if (isPrismaUniqueViolation(error)) {
        throw new ServiceError(
          "Voucher codes collided with another generation. Please retry.",
          409
        );
      }
      throw error;
    }

    invalidateVoucherCaches();

    return {
      generated: totalCreated,
      message: `Generated ${totalCreated} voucher codes for TSh ${price.toLocaleString()}`,
    };
  },

  async list(params: {
    page?: number;
    limit?: number;
    status?: string;
    price?: number;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, price, search } = params;

    const where: Record<string, unknown> = {};
    if (status === "available") {
      where.isUsed = false;
      where.subscriptionId = null;
    } else if (status === "used") {
      where.isUsed = true;
    }
    if (price !== undefined) where.price = price;
    if (search) where.code = { contains: search };

    const [total, vouchers] = await Promise.all([
      prisma.voucher.count({ where }),
      prisma.voucher.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        skip: (page - 1) * limit,
      }),
    ]);

    return {
      data: vouchers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  /** Deletes an unused voucher. Used vouchers are retained for audit history. */
  async deleteIfUnused(id: number): Promise<boolean> {
    const result = await prisma.voucher.deleteMany({
      where: { id, isUsed: false, subscriptionId: null },
    });
    if (result.count > 0) {
      invalidateVoucherCaches();
      return true;
    }
    return false;
  },

  /** Exports all vouchers matching filters as plain rows for CSV generation. */
  async exportRows(params: { status?: string; price?: number }) {
    const where: Record<string, unknown> = {};
    if (params.status === "available") {
      where.isUsed = false;
      where.subscriptionId = null;
    } else if (params.status === "used") {
      where.isUsed = true;
    }
    if (params.price !== undefined) where.price = params.price;

    return prisma.voucher.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50000,
      select: {
        code: true,
        price: true,
        isUsed: true,
        subscriptionId: true,
        createdAt: true,
      },
    });
  },
};

function generateVoucherCode(): string {
  return Array.from(crypto.randomBytes(10), (b) => (b % 10).toString()).join(
    ""
  );
}

/**
 * Generates N codes that do not already exist in the database, refilling
 * any that collide so createMany never trips the unique constraint.
 */
async function buildUniqueCodes(count: number): Promise<string[]> {
  const codes = new Set<string>();
  for (let round = 0; round < 10 && codes.size < count; round++) {
    const generated = new Set<string>();
    while (generated.size < count) {
      generated.add(generateVoucherCode());
    }
    const existing = await prisma.voucher.findMany({
      where: { code: { in: Array.from(generated) } },
      select: { code: true },
    });
    const existingSet = new Set(existing.map((v) => v.code));
    for (const code of generated) {
      if (!existingSet.has(code)) {
        codes.add(code);
        if (codes.size === count) break;
      }
    }
  }
  return Array.from(codes);
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/** Cache keys derived from voucher state must be invalidated together. */
function invalidateVoucherCaches() {
  for (const key of cache.keys()) {
    if (
      key.startsWith("voucher-availability") ||
      key.startsWith("voucher-analytics") ||
      key === "dashboard-stats"
    ) {
      cache.delete(key);
    }
  }
}
