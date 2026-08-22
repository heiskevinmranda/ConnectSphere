import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentsService } from "@/modules/payments/services/payments.service";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";

export async function POST(
  request: NextRequest,
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

    const result = await paymentsService.checkPaymentStatus(reference);
    return apiSuccess(result);
  } catch {
    return apiError("Failed to simulate payment", 500);
  }
}
