import { NextRequest } from "next/server";
import { paymentsService } from "@/modules/payments/services/payments.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const priceStr = pathParts[pathParts.length - 1];
    const price = priceStr && priceStr !== "voucher-availability"
      ? parseInt(priceStr)
      : undefined;

    const data = await paymentsService.checkVoucherAvailability(
      price && !isNaN(price) ? price : undefined
    );
    return apiSuccess(data);
  } catch {
    return apiError("Failed to check voucher availability", 500);
  }
}
