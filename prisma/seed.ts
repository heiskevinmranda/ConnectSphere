import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

const DEFAULT_ADMINS = [
  {
    email: "admin@connectsphere.co.tz",
    password: "Admin@123",
    role: "admin",
  },
  {
    email: "superadmin@connectsphere.co.tz",
    password: "Super@123",
    role: "super_admin",
  },
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
  const digits = new Uint8Array(10);
  crypto.getRandomValues(digits);
  return Array.from(digits, (b) => (b % 10).toString()).join("");
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

  for (const admin of DEFAULT_ADMINS) {
    const existing = await prisma.admin.findUnique({
      where: { email: admin.email },
    });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      await prisma.admin.create({
        data: {
          email: admin.email,
          password: hashedPassword,
          role: admin.role,
        },
      });
      console.log(`Created ${admin.role}: ${admin.email}`);
    } else if (existing.role !== admin.role) {
      await prisma.admin.update({
        where: { email: admin.email },
        data: { role: admin.role },
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

  console.log("Seeding complete");
}

seed()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
