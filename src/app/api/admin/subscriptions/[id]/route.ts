import { NextRequest } from "next/server";
import { customersService } from "@/modules/customers/services/customers.service";
import { getAdminContext, recordAudit, getAdminId } from "@/lib/audit";
import { canManageSystem } from "@/lib/auth";
import { getClientIp } from "@/lib/rate-limit";
import { isServiceError } from "@/lib/errors";
import {
  apiSuccess,
  apiError,
  apiBadRequest,
  apiForbidden,
} from "@/lib/api-response";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiError("Missing admin context", 401);

  // Destructive removal reserved for super admins (financial history).
  if (!canManageSystem(ctx.role)) {
    return apiForbidden(
      "Only super administrators can delete subscription records."
    );
  }

  try {
    const { id } = await params;
    const subId = parseInt(id);
    if (isNaN(subId)) return apiBadRequest("Invalid subscription ID");

    const subscription =
      await customersService.deleteSubscription(subId);

    await recordAudit({
      actor: ctx.email,
      action: "subscription.delete",
      target: subscription?.phoneNumber ?? String(subId),
      details: {
        id: subId,
        plan: subscription?.plan,
        status: subscription?.status,
      },
      adminId: getAdminId(request.headers),
      ip: getClientIp(request),
    });

    return apiSuccess(null, "Subscription deleted successfully");
  } catch (error) {
    if (isServiceError(error)) {
      return apiError(error.message, error.statusCode);
    }
    console.error("[subscriptions] delete failed:", error);
    return apiError("Failed to delete subscription", 500);
  }
}
