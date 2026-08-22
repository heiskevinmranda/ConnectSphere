import { NextRequest } from "next/server";
import { paymentsService } from "@/modules/payments/services/payments.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ price: string }> }
) {
  try {
    const { price } = await params;
    const priceNum = parseInt(price);
    const data = await paymentsService.checkVoucherAvailability(
      isNaN(priceNum) ? undefined : priceNum
    );
    return apiSuccess(data);
  } catch {
    return apiError("Failed to check voucher availability", 500);
  }
}
