import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/audit";
import { canManageSystem } from "@/lib/auth";
import { apiSuccess, apiError, apiBadRequest, apiForbidden } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiError("Missing admin context", 401);

  if (!canManageSystem(ctx.role)) {
    return apiForbidden("Only super administrators can view audit logs.");
  }

  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
    const limitRaw = parseInt(url.searchParams.get("limit") || "25");
    const limit = Math.min(100, Math.max(1, limitRaw || 25));
    const action = url.searchParams.get("action") || undefined;
    const actor = url.searchParams.get("actor") || undefined;
    const status = url.searchParams.get("status") || undefined;

    if (status && !["success", "failure"].includes(status)) {
      return apiBadRequest("Invalid status filter");
    }

    const where: Record<string, unknown> = {};
    if (action) where.action = { contains: action };
    if (actor) where.actor = { contains: actor };
    if (status === "success" || status === "failure") where.status = status;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
    ]);

    return apiSuccess({
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("[audit] list failed:", error);
    return apiError("Failed to fetch audit logs", 500);
  }
}
