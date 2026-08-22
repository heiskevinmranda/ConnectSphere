import { NextRequest } from "next/server";
import { vouchersService } from "@/modules/vouchers/services/vouchers.service";
import { voucherGenerateSchema } from "@/modules/vouchers/schemas/vouchers.schema";
import { getAdminContext, recordAudit, getAdminId } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { isServiceError } from "@/lib/errors";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiError("Missing admin context", 401);

  try {
    const body = await request.json();
    const parsed = voucherGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return apiBadRequest(
        "Validation failed",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const result = await vouchersService.generate(
      parsed.data.count,
      parsed.data.price
    );

    await recordAudit({
      actor: ctx.email,
      action: "voucher.generate",
      details: { count: parsed.data.count, price: parsed.data.price },
      adminId: getAdminId(request.headers),
      ip: getClientIp(request),
    });

    return apiSuccess(result);
  } catch (error) {
    if (isServiceError(error)) {
      return apiError(error.message, error.statusCode);
    }
    console.error("[vouchers] generate failed:", error);
    return apiError("Failed to generate vouchers", 500);
  }
}
