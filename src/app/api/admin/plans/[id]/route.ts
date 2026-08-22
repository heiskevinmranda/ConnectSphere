import { NextRequest } from "next/server";
import { plansService } from "@/modules/plans/services/plans.service";
import { planUpdateSchema } from "@/modules/plans/schemas/plans.schema";
import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";
import { getAdminContext, recordAudit, getAdminId } from "@/lib/audit";
import { canManageSystem } from "@/lib/auth";
import { getClientIp } from "@/lib/rate-limit";
import {
  apiSuccess,
  apiError,
  apiBadRequest,
  apiNotFound,
  apiConflict,
  apiForbidden,
} from "@/lib/api-response";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiError("Missing admin context", 401);

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
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const nameExists = await plansService.findByName(parsed.data.name);
      if (nameExists)
        return apiConflict("A plan with this name already exists");
    }

    const plan = await plansService.update(planId, parsed.data);
    cache.delete("dashboard-stats");

    await recordAudit({
      actor: ctx.email,
      action: "plan.update",
      target: existing.slug,
      details: parsed.data,
      ip: getClientIp(request),
      adminId: getAdminId(request.headers),
    });

    return apiSuccess(plan, "Plan updated successfully");
  } catch (error) {
    console.error("[plans] update failed:", error);
    return apiError("Failed to update plan", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiError("Missing admin context", 401);

  // Destructive operation reserved for super admins.
  if (!canManageSystem(ctx.role)) {
    return apiForbidden(
      "Only super administrators can delete plans. Deactivate the plan instead."
    );
  }

  try {
    const { id } = await params;
    const planId = parseInt(id);
    if (isNaN(planId)) return apiBadRequest("Invalid plan ID");

    const existing = await plansService.findById(planId);
    if (!existing) return apiNotFound("Plan not found");

    // Business rule: never orphan active subscriptions on a live price tier.
    const activeCount = await prisma.subscription.count({
      where: { plan: existing.slug, status: "active" },
    });
    if (activeCount > 0) {
      return apiConflict(
        `Cannot delete "${existing.name}": ${activeCount} active subscription(s) still use it. Deactivate it instead.`
      );
    }

    await plansService.delete(planId);
    cache.delete("dashboard-stats");

    await recordAudit({
      actor: ctx.email,
      action: "plan.delete",
      target: existing.slug,
      details: { id: existing.id, name: existing.name },
      ip: getClientIp(request),
      adminId: getAdminId(request.headers),
    });

    return apiSuccess(null, "Plan deleted successfully");
  } catch (error) {
    console.error("[plans] delete failed:", error);
    return apiError("Failed to delete plan", 500);
  }
}
