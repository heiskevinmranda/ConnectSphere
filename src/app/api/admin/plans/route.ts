import { NextRequest } from "next/server";
import { plansService } from "@/modules/plans/services/plans.service";
import { planCreateSchema } from "@/modules/plans/schemas/plans.schema";
import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";
import { getAdminContext, recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import {
  apiSuccess,
  apiError,
  apiBadRequest,
  apiConflict,
} from "@/lib/api-response";

export async function GET() {
  try {
    const plans = await plansService.listAll();
    return apiSuccess(plans);
  } catch {
    return apiError("Failed to fetch plans", 500);
  }
}

export async function POST(request: NextRequest) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiError("Missing admin context", 401);

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

    await recordAudit({
      actor: ctx.email,
      action: "plan.create",
      target: plan.slug,
      details: { id: plan.id, name: plan.name, price: plan.price },
      ip: getClientIp(request),
    });

    return apiSuccess(plan, "Plan created successfully");
  } catch (error) {
    console.error("[plans] create failed:", error);
    return apiError("Failed to create plan", 500);
  }
}
