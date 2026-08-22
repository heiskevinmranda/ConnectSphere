import { NextRequest } from "next/server";
import { subscriptionsService } from "@/modules/subscriptions/services/subscriptions.service";
import { apiSuccess, apiError, apiBadRequest, apiNotFound } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();
    if (!phoneNumber) return apiBadRequest("Phone number is required");

    const result = await subscriptionsService.getVoucher(phoneNumber);
    if (!result.success) {
      return apiNotFound(result.message || "Voucher not found");
    }

    return apiSuccess(result);
  } catch {
    return apiError("Failed to retrieve voucher", 500);
  }
}
