import { NextRequest } from "next/server";
import { authService } from "@/modules/auth/services/auth.service";
import { changePasswordSchema } from "@/modules/auth/schemas/auth.schema";
import { getAdminContext, recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { apiSuccess, apiError, apiBadRequest, apiUnauthorized } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiUnauthorized();

  try {
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest(
        "Validation failed",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const result = await authService.changePassword(
      ctx.email,
      parsed.data.currentPassword,
      parsed.data.newPassword
    );

    await recordAudit({
      actor: ctx.email,
      actorType: "admin",
      action: "admin.password.change",
      status: result.success ? "success" : "failure",
      ip: getClientIp(request),
    });

    if (!result.success) {
      return apiBadRequest(result.message);
    }

    return apiSuccess(null, result.message);
  } catch {
    return apiError("Failed to change password", 500);
  }
}
