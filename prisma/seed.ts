import "dotenv/config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const DEFAULT_ADMIN_EMAIL = "admin@connectsphere.co.tz";
const DEFAULT_ADMIN_PASSWORD = "Admin@123";

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

async function seed() {
  console.log("Seeding database...");

  // Seed admin
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await prisma.admin.create({
      data: {
        email: DEFAULT_ADMIN_EMAIL,
        password: hashedPassword,
      },
    });
    console.log("Default admin created");
  } else {
    console.log("Admin account already exists");
  }

  // Seed plans
  for (const plan of DEFAULT_PLANS) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {},
      create: plan,
    });
  }
  console.log("Default plans ensured");

  console.log("Seeding complete");
}

seed()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
