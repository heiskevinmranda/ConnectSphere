import { NextRequest } from "next/server";
import { subscriptionsService } from "@/modules/subscriptions/services/subscriptions.service";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();
    if (!phoneNumber) return apiBadRequest("Phone number is required");

    const result = await subscriptionsService.checkSubscription(phoneNumber);
    return apiSuccess(result);
  } catch {
    return apiError("Failed to check subscription", 500);
  }
}
