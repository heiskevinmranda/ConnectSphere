import "dotenv/config";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

/**
 * Admin accounts are configured via env with strong random fallbacks.
 * Nothing in this file contains a real password; generated credentials
 * are printed once at the end of a successful seed run.
 */
function generatePassword(length = 16): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
  const bytes = new Uint8Array(length * 2);
  const chars: string[] = [];
  while (chars.length < length) {
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < charset.length) {
        chars.push(charset[b]);
        if (chars.length === length) break;
      }
    }
  }
  return chars.join("");
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@connectsphere.co.tz";
const SUPER_ADMIN_EMAIL =
  process.env.SUPER_ADMIN_EMAIL || "superadmin@connectsphere.co.tz";

const ADMIN_ACCOUNTS = [
  { email: ADMIN_EMAIL, role: "admin" as const },
  { email: SUPER_ADMIN_EMAIL, role: "super_admin" as const },
];

const DEFAULT_PLANS = [
  {
    name: "Starter",
    slug: "starter",
    price: 1000,
    duration: 1,
    description: "Perfect for basic browsing and messaging",
    icon: "wifi",
    sortOrder: 1,
  },
  {
    name: "Basic",
    slug: "basic",
    price: 2000,
    duration: 3,
    description: "Great for social media and light streaming",
    icon: "signal",
    sortOrder: 2,
  },
  {
    name: "Standard",
    slug: "standard",
    price: 5000,
    duration: 7,
    description: "Ideal for work and entertainment",
    icon: "gauge",
    sortOrder: 3,
  },
  {
    name: "Premium",
    slug: "premium",
    price: 10000,
    duration: 15,
    description: "Perfect for heavy usage and streaming",
    icon: "rocket",
    sortOrder: 4,
  },
  {
    name: "Elite",
    slug: "elite",
    price: 20000,
    duration: 30,
    description: "Ultimate package for power users",
    icon: "star",
    sortOrder: 5,
  },
];

// Starter voucher inventory per price tier so the public purchase
// flow works immediately after seeding.
const STARTER_VOUCHERS_PER_TIER = [1000, 2000, 5000, 10000, 20000].map(
  (price) => ({ price, count: 50 })
);

function generateVoucherCode(): string {
  const bytes = new Uint8Array(10);
  const digits: number[] = [];
  while (digits.length < 10) {
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b >= 250) continue; // rejection sampling: uniform 0-9 from 0-249
      digits.push(b % 10);
      if (digits.length === 10) break;
    }
  }
  return digits.join("");
}

async function seedVouchers() {
  for (const { price, count } of STARTER_VOUCHERS_PER_TIER) {
    const existing = await prisma.voucher.count({
      where: { price, isUsed: false, subscriptionId: null },
    });
    const toCreate = Math.max(0, count - existing);
    if (toCreate === 0) continue;

    const codes = new Set<string>();
    while (codes.size < toCreate) {
      codes.add(generateVoucherCode());
    }

    await prisma.voucher.createMany({
      data: Array.from(codes, (code) => ({
        code,
        price,
        isUsed: false,
      })),
    });
    console.log(`Seeded ${toCreate} vouchers at TSh ${price.toLocaleString()}`);
  }
}

async function seed() {
  console.log("Seeding database...");

  const createdCredentials: { email: string; password: string }[] = [];

  for (const account of ADMIN_ACCOUNTS) {
    const existing = await prisma.admin.findUnique({
      where: { email: account.email },
    });

    if (!existing) {
      const envPassword =
        account.role === "super_admin"
          ? process.env.SUPER_ADMIN_PASSWORD
          : process.env.ADMIN_PASSWORD;
      const password = envPassword || generatePassword();
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.admin.create({
        data: {
          email: account.email,
          password: hashedPassword,
          role: account.role,
        },
      });
      if (!envPassword) createdCredentials.push({ email: account.email, password });
      console.log(`Created ${account.role}: ${account.email}`);
    } else if (existing.role !== account.role) {
      await prisma.admin.update({
        where: { email: account.email },
        data: { role: account.role },
      });
    }
  }

  for (const plan of DEFAULT_PLANS) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {},
      create: plan,
    });
  }
  console.log("Default plans ensured");

  await seedVouchers();

  async function seedNetworkDevices() {
    const count = await prisma.networkDevice.count();
    if (count > 0) return;

    await prisma.networkDevice.create({
      data: {
        name: "Core Router - Dar es Salaam",
        type: "router",
        model: "Community Hotspot Gateway",
        ip: "192.168.1.1",
        macAddress: process.env.ROUTER_MAC_ADDRESS || null,
        serialNumber: process.env.ROUTER_SERIAL_NUMBER || null,
        location: "Dar es Salaam",
        isOnline: false,
      },
    });
    console.log("Seeded initial network device inventory (Core Router)");
  }

  await seedNetworkDevices();

  console.log("Seeding complete");

  if (createdCredentials.length > 0) {
    console.warn(
      "\nIMPORTANT: Credentials generated by this seed. Store them safely.\n"
    );
    for (const cred of createdCredentials) {
      console.warn(`  ${cred.email}  password: ${cred.password}`);
    }
    console.warn("");
  }

  if (!process.env.ADMIN_PASSWORD && !process.env.SUPER_ADMIN_PASSWORD) {
    console.warn(
      "Tip: set ADMIN_PASSWORD / SUPER_ADMIN_PASSWORD in .env to avoid random credentials."
    );
  }
}

seed()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
