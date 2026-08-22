import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentsService } from "@/modules/payments/services/payments.service";
import { webhookEventSchema } from "@/modules/payments/schemas/payments.schema";
import { recordAudit } from "@/lib/audit";
import { apiSuccess, apiError, apiBadRequest, apiNotFound } from "@/lib/api-response";

/**
 * AzamPay payment callback.
 *
 * When WEBHOOK_SECRET is configured the caller must send it in the
 * "x-webhook-secret" header. Every SUCCESSFUL event is re-verified with
 * the provider before a subscription is provisioned, so forged events
 * cannot activate service on their own.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && request.headers.get("x-webhook-secret") !== secret) {
    await recordAudit({
      actor: "azampay",
      actorType: "system",
      action: "payment.webhook.unauthorized",
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      status: "failure",
    });
    return apiUnauthorizedJson();
  }

  try {
    const body = await request.json();
    const parsed = webhookEventSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest(
        "Invalid webhook payload",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const { transId, externalId, reference, status } = parsed.data;

    if (!transId && !externalId && !reference) {
      return apiBadRequest("Webhook payload must identify a transaction");
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          ...(transId ? [{ azampayTransactionId: transId }] : []),
          ...(externalId ? [{ paymentReference: externalId }] : []),
          ...(reference ? [{ paymentReference: reference }] : []),
        ],
      },
    });

    if (!payment) return apiNotFound("Payment not found");

    if (status === "SUCCESSFUL") {
      // Re-verify with the provider; do not trust the callback alone.
      await paymentsService.checkPaymentStatus(payment.paymentReference);
    } else if (payment.status === "pending") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed" },
      });
      await recordAudit({
        actor: payment.phoneNumber,
        actorType: "customer",
        action: "payment.failed",
        target: payment.paymentReference,
        details: { reason: "webhook_failed", transId: transId ?? null },
      });
    }

    return apiSuccess({ message: "Webhook processed" });
  } catch (error) {
    console.error("[webhook] processing failed:", error);
    return apiError("Webhook processing failed", 500);
  }
}

function apiUnauthorizedJson() {
  return Response.json(
    { success: false, message: "Unauthorized webhook call." },
    { status: 401 }
  );
}
