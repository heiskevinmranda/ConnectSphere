import { NextRequest } from "next/server";
import { customersService } from "@/modules/customers/services/customers.service";
import { getAdminContext, recordAudit, getAdminId } from "@/lib/audit";
import { canManageSystem } from "@/lib/auth";
import { getClientIp } from "@/lib/rate-limit";
import { isServiceError } from "@/lib/errors";
import {
  apiSuccess,
  apiError,
  apiNotFound,
  apiBadRequest,
  apiForbidden,
} from "@/lib/api-response";

/** Cancels an active subscription and revokes its router access. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiError("Missing admin context", 401);

  // Cancelling terminates paid service the operator already sold.
  if (!canManageSystem(ctx.role)) {
    return apiForbidden(
      "Only super administrators can cancel subscriptions."
    );
  }

  try {
    const { id } = await params;
    const subId = parseInt(id);
    if (isNaN(subId)) return apiBadRequest("Invalid subscription ID");

    const subscription = await customersService.cancelSubscription(subId);
    if (!subscription) return apiNotFound("Subscription not found");

    await recordAudit({
      actor: ctx.email,
      action: "subscription.cancel",
      target: subscription.phoneNumber,
      details: {
        id: subId,
        plan: subscription.plan,
        amount: subscription.amount,
      },
      adminId: getAdminId(request.headers),
      ip: getClientIp(request),
    });

    return apiSuccess(null, "Subscription cancelled successfully");
  } catch (error) {
    if (isServiceError(error)) {
      return apiError(error.message, error.statusCode);
    }
    console.error("[subscriptions] cancel failed:", error);
    return apiError("Failed to cancel subscription", 500);
  }
}
