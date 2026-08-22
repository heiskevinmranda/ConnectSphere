import { NextRequest } from "next/server";
import { vouchersService } from "@/modules/vouchers/services/vouchers.service";
import { voucherUploadSchema } from "@/modules/vouchers/schemas/vouchers.schema";
import { getAdminContext, recordAudit, getAdminId } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { isServiceError } from "@/lib/errors";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiError("Missing admin context", 401);

  try {
    const body = await request.json();
    const parsed = voucherUploadSchema.safeParse(body);

    if (!parsed.success) {
      return apiBadRequest(
        "Validation failed",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const result = await vouchersService.upload(parsed.data.vouchers);

    await recordAudit({
      actor: ctx.email,
      action: "voucher.upload",
      details: {
        submitted: parsed.data.vouchers.length,
        inserted: result.insertedCount,
      },
      adminId: getAdminId(request.headers),
      ip: getClientIp(request),
    });

    return apiSuccess(result);
  } catch (error) {
    if (isServiceError(error)) {
      return apiError(error.message, error.statusCode);
    }
    console.error("[vouchers] upload failed:", error);
    return apiError("Failed to upload vouchers", 500);
  }
}
