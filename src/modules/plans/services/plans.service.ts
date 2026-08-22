import { prisma } from "@/lib/prisma";
import type { Plan } from "../types/plans.types";

export const plansService = {
  async listAll(): Promise<Plan[]> {
    return prisma.plan.findMany({
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    }) as Promise<Plan[]>;
  },

  async listActive() {
    return prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        duration: true,
        description: true,
        icon: true,
      },
    });
  },

  async findById(id: number) {
    return prisma.plan.findUnique({ where: { id } });
  },

  async create(data: {
    name: string;
    slug: string;
    price: number;
    duration: number;
    description?: string;
    icon?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return prisma.plan.create({ data });
  },

  async update(
    id: number,
    data: {
      name?: string;
      slug?: string;
      price?: number;
      duration?: number;
      description?: string;
      icon?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) {
    return prisma.plan.update({ where: { id }, data });
  },

  async delete(id: number) {
    return prisma.plan.delete({ where: { id } });
  },

  async findBySlug(slug: string) {
    return prisma.plan.findUnique({ where: { slug } });
  },

  async findByName(name: string) {
    return prisma.plan.findFirst({ where: { name } });
  },
};
