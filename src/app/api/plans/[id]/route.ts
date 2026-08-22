import { NextRequest } from "next/server";
import { plansService } from "@/modules/plans/services/plans.service";
import { planUpdateSchema } from "@/modules/plans/schemas/plans.schema";
import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";
import { apiSuccess, apiError, apiBadRequest, apiNotFound, apiConflict } from "@/lib/api-response";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planId = parseInt(id);
    if (isNaN(planId)) return apiBadRequest("Invalid plan ID");

    const existing = await plansService.findById(planId);
    if (!existing) return apiNotFound("Plan not found");

    const body = await request.json();
    const parsed = planUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest(
        "Validation failed",
        parsed.error.issues.map((e) => e.message)
      );
    }

    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const slugExists = await plansService.findBySlug(parsed.data.slug);
      if (slugExists) return apiConflict("A plan with this slug already exists");
    }

    const plan = await plansService.update(planId, parsed.data);
    cache.delete("dashboard-stats");
    return apiSuccess(plan, "Plan updated successfully");
  } catch {
    return apiError("Failed to update plan", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planId = parseInt(id);
    if (isNaN(planId)) return apiBadRequest("Invalid plan ID");

    const existing = await plansService.findById(planId);
    if (!existing) return apiNotFound("Plan not found");

    await plansService.delete(planId);
    cache.delete("dashboard-stats");
    return apiSuccess(null, "Plan deleted successfully");
  } catch {
    return apiError("Failed to delete plan", 500);
  }
}
