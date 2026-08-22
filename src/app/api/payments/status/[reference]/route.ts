import { NextRequest } from "next/server";
import { paymentsService } from "@/modules/payments/services/payments.service";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
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
