import { NextRequest } from "next/server";
import { subscriptionsService } from "@/modules/subscriptions/services/subscriptions.service";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const checkSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+255\d{9}$/, "Phone number must be a valid Tanzanian number"),
});

export async function POST(request: NextRequest) {
  const limit = rateLimit(`sub-check:${getClientIp(request)}`, 10, 60);
  if (!limit.allowed) {
    return apiError(
      `Too many lookups. Try again in ${limit.retryAfterSeconds} seconds.`,
      429
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest("Invalid JSON body");
    }

    const parsed = checkSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest(
        "Validation failed",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const result = await subscriptionsService.checkSubscription(
      parsed.data.phoneNumber
    );
    return apiSuccess(result);
  } catch {
    return apiError("Failed to check subscription", 500);
  }
}
