import { NextRequest } from "next/server";
import { plansService } from "@/modules/plans/services/plans.service";
import { planCreateSchema } from "@/modules/plans/schemas/plans.schema";
import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";
import { apiSuccess, apiError, apiBadRequest, apiConflict } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const publicOnly = url.pathname.endsWith("/public");

    if (publicOnly) {
      const plans = await plansService.listActive();
      return apiSuccess(plans);
    }

    const plans = await plansService.listAll();
    return apiSuccess(plans);
  } catch {
    return apiError("Failed to fetch plans", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) return apiBadRequest("Plan ID is required");

    const body = await request.json();
    const parsed = planCreateSchema.partial().safeParse(body);
    if (!parsed.success) {
      return apiBadRequest("Validation failed", parsed.error.issues.map((e) => e.message));
    }

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) return apiError("Plan not found", 404);

    if (parsed.data.slug || parsed.data.name) {
      const conflict = await prisma.plan.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(parsed.data.slug ? [{ slug: parsed.data.slug }] : []),
            ...(parsed.data.name ? [{ name: parsed.data.name }] : []),
          ],
        },
      });
      if (conflict) return apiConflict("A plan with this name or slug already exists");
    }

    const plan = await prisma.plan.update({ where: { id }, data: parsed.data });
    cache.delete("dashboard-stats");
    return apiSuccess(plan, "Plan updated successfully");
  } catch {
    return apiError("Failed to update plan", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) return apiBadRequest("Plan ID is required");

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) return apiError("Plan not found", 404);

    await prisma.plan.delete({ where: { id } });
    cache.delete("dashboard-stats");
    return apiSuccess(null, "Plan deleted successfully");
  } catch {
    return apiError("Failed to delete plan", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = planCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiBadRequest(
        "Validation failed",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const { name, slug } = parsed.data;

    const existing = await prisma.plan.findFirst({
      where: { OR: [{ slug }, { name }] },
    });

    if (existing) {
      return apiConflict("A plan with this name or slug already exists");
    }

    const plan = await plansService.create(parsed.data);
    cache.delete("dashboard-stats");
    return apiSuccess(plan, "Plan created successfully");
  } catch {
    return apiError("Failed to create plan", 500);
  }
}
