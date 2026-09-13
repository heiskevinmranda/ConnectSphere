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

  // Deleting payment records erases financial history.
  if (!canManageSystem(ctx.role)) {
    return apiForbidden(
      "Only super administrators can delete payment records."
    );
  }

  try {
    const { id } = await params;
    const paymentId = parseInt(id);
    if (isNaN(paymentId)) return apiBadRequest("Invalid payment ID");

    const payment = await customersService.deletePayment(paymentId);

    await recordAudit({
      actor: ctx.email,
      action: "payment.delete",
      target: payment?.paymentReference ?? String(paymentId),
      details: {
        id: paymentId,
        status: payment?.status,
        amount: payment?.amount,
      },
      adminId: getAdminId(request.headers),
      ip: getClientIp(request),
    });

    return apiSuccess(null, "Payment record deleted successfully");
  } catch (error) {
    if (isServiceError(error)) {
      return apiError(error.message, error.statusCode);
    }
    console.error("[payments] delete failed:", error);
    return apiError("Failed to delete payment", 500);
  }
}
