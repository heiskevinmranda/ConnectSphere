import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentsService } from "@/modules/payments/services/payments.service";
import { webhookEventSchema } from "@/modules/payments/schemas/payments.schema";
import { recordAudit } from "@/lib/audit";
import { constantTimeEqual } from "@/lib/secrets";
import { apiSuccess, apiError, apiBadRequest, apiNotFound } from "@/lib/api-response";

/**
 * AzamPay payment callback.
 *
 * Requires the WEBHOOK_SECRET in the "x-webhook-secret" header. In
 * production the endpoint refuses to run at all without a configured
 * secret (fail-closed). Every SUCCESSFUL event is re-verified with the
 * provider before a subscription is provisioned, so forged events
 * cannot activate service on their own.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[webhook] WEBHOOK_SECRET is not configured; ignoring webhook in production."
      );
      return apiError("Webhook endpoint is not configured", 503);
    }
    // Development only: allow unsigned deliveries so sandbox testing is
    // not blocked by missing configuration.
  } else {
    const provided = request.headers.get("x-webhook-secret") ?? "";
    if (!constantTimeEqual(provided, secret)) {
      await recordAudit({
        actor: "azampay",
        actorType: "system",
        action: "payment.webhook.unauthorized",
        ip: getWebhookIp(request),
        status: "failure",
      });
      return apiUnauthorizedJson();
    }
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

function getWebhookIp(request: NextRequest): string | undefined {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for") ??
    undefined
  );
}
