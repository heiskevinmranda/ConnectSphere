import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentsService } from "@/modules/payments/services/payments.service";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";

/**
 * Development-only helper that completes a simulated payment so the full
 * purchase flow can be exercised without the AzamPay sandbox. Disabled
 * in production builds.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  if (process.env.NODE_ENV !== "development") {
    return apiError("Not found", 404);
  }

  try {
    const { reference } = await params;
    const payment = await prisma.payment.findUnique({
      where: { paymentReference: reference },
    });

    if (!payment) return apiBadRequest("Payment not found");
    if (payment.status !== "pending") {
      return apiSuccess({ message: "Payment is not in pending status" });
    }
    if (payment.azampayTransactionId?.startsWith("SIM_") === false) {
      return apiBadRequest(
        "Only simulated payments can be completed via this endpoint"
      );
    }

    const completed = await paymentsService.completePendingPayment(payment.id);
    if (!completed) {
      return apiBadRequest("Payment could not be completed");
    }

    const result = await paymentsService.checkPaymentStatus(reference);
    return apiSuccess(result);
  } catch {
    return apiError("Failed to simulate payment", 500);
  }
}
