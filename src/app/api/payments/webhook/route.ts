import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentsService } from "@/modules/payments/services/payments.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const { transId, status, externalId } = await request.json();

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { azampayTransactionId: transId },
          { paymentReference: externalId },
        ].filter(Boolean) as Record<string, unknown>[],
      },
    });

    if (!payment) return apiError("Payment not found", 404);

    if (status === "SUCCESSFUL") {
      await paymentsService.checkPaymentStatus(payment.paymentReference);
    } else if (status === "FAILED") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed" },
      });
    }

    return apiSuccess({ message: "Webhook processed" });
  } catch {
    return apiError("Webhook processing failed", 500);
  }
}
