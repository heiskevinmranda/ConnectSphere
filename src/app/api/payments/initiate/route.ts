import { NextRequest, NextResponse } from "next/server";
import { paymentsService } from "@/modules/payments/services/payments.service";
import { paymentInitiateSchema } from "@/modules/payments/schemas/payments.schema";
import { recordAudit } from "@/lib/audit";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  apiSuccess,
  apiError,
  apiBadRequest,
  apiNotFound,
} from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Abuse guard: payment initiation triggers SMS prompts on customer phones.
  const limit = rateLimit(`pay-init:${ip}`, 10, 300);
  if (!limit.allowed) {
    return apiError(
      `Too many payment attempts. Try again in ${limit.retryAfterSeconds} seconds.`,
      429
    );
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      return apiBadRequest("Request body is empty");
    }

    const parsed = paymentInitiateSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest(
        "Validation failed",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const { phoneNumber, plan } = parsed.data;
    const result = await paymentsService.initiatePayment(phoneNumber, plan);

    if (!result.success) {
      await recordAudit({
        actor: phoneNumber,
        actorType: "customer",
        action: "payment.initiate.rejected",
        target: plan,
        details: { code: result.code },
        ip,
      });

      if (result.code === "PLAN_NOT_FOUND") {
        return apiNotFound(result.message);
      }
      if (result.code === "OUT_OF_STOCK") {
        return NextResponse.json(
          {
            success: false,
            message: result.message,
            data: { outOfStock: true },
          },
          { status: 503 }
        );
      }
      if (result.code === "PROVIDER_UNAVAILABLE") {
        return apiError(result.message, 503);
      }
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          data: {
            hasActiveSubscription: true,
            existingSubscription: result.existingSubscription,
          },
        },
        { status: 409 }
      );
    }

    return apiSuccess(result, result.message);
  } catch (error) {
    // Never leak internal details to the caller. Log them server-side.
    if (error instanceof Error) {
      console.error("[payments/initiate] unexpected error:", error);
    }
    return apiError("Payment could not be initiated. Please try again.", 500);
  }
}
