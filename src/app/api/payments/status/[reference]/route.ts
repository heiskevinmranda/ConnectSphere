import { NextRequest } from "next/server";
import { paymentsService } from "@/modules/payments/services/payments.service";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api-response";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const ip = getClientIp(request);

  const limit = rateLimit(`pay-status:${ip}`, 120, 60);
  if (!limit.allowed) {
    return apiError(
      "Too many status checks. Try again shortly.",
      429
    );
  }

  try {
    const { reference } = await params;
    const result = await paymentsService.checkPaymentStatus(reference);

    if (!result.success) {
      return apiNotFound(result.message || "Payment not found");
    }

    return apiSuccess(result);
  } catch {
    return apiError("Failed to check payment status", 500);
  }
}
