import { NextRequest } from "next/server";
import { authService } from "@/modules/auth/services/auth.service";
import { loginSchema } from "@/modules/auth/schemas/auth.schema";
import { recordAudit } from "@/lib/audit";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { apiSuccess, apiError, apiBadRequest, apiUnauthorized } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const limit = rateLimit(`login:${ip}`, 15, 300);
  if (!limit.allowed) {
    await recordAudit({
      actor: ip,
      actorType: "admin",
      action: "admin.login.rate_limited",
      ip,
      status: "failure",
    });
    return apiError(
      `Too many login attempts. Try again in ${limit.retryAfterSeconds} seconds.`,
      429
    );
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest(
        "Validation failed",
        parsed.error.issues.map((e) => e.message)
      );
    }

    // Per-account throttle (not spoofable the way IP headers are).
    const accountLimit = rateLimit(
      `login:${parsed.data.email.toLowerCase()}:${ip}`,
      5,
      300
    );
    if (!accountLimit.allowed) {
      await recordAudit({
        actor: parsed.data.email,
        actorType: "admin",
        action: "admin.login.rate_limited",
        ip,
        status: "failure",
      });
      return apiError(
        `Too many login attempts for this account. Try again in ${accountLimit.retryAfterSeconds} seconds.`,
        429
      );
    }

    const result = await authService.login(parsed.data);
    if (!result.success) {
      await recordAudit({
        actor: parsed.data.email,
        actorType: "admin",
        action: "admin.login.failed",
        ip,
        status: "failure",
      });
      return apiUnauthorized(result.message);
    }

    await recordAudit({
      actor: result.admin.email,
      actorType: "admin",
      action: "admin.login.success",
      adminId: result.admin.id,
      ip,
    });

    return apiSuccess(result);
  } catch (error) {
    console.error("[auth/login] unexpected error:", error);
    return apiError("Login failed", 500);
  }
}
