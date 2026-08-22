import { NextRequest } from "next/server";
import { paymentsService } from "@/modules/payments/services/payments.service";
import { paymentInitiateSchema } from "@/modules/payments/schemas/payments.schema";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || Object.keys(body).length === 0) {
      return apiBadRequest("Request body is empty");
    }

    const parsed = paymentInitiateSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest(
        "Validation failed",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const { phoneNumber, plan, amount } = parsed.data;
    const result = await paymentsService.initiatePayment(phoneNumber, plan, amount);

    return apiSuccess(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment initiation failed";
    return apiError(message, 500);
  }
}
