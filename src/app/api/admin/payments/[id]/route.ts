import { NextRequest } from "next/server";
import { customersService } from "@/modules/customers/services/customers.service";
import { apiSuccess, apiError, apiNotFound, apiBadRequest } from "@/lib/api-response";
import { cache } from "@/lib/cache";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentId = parseInt(id);
    if (isNaN(paymentId)) return apiBadRequest("Invalid payment ID");

    const deleted = await customersService.deletePayment(paymentId);
    if (!deleted) return apiNotFound("Payment not found");

    cache.delete("dashboard-stats");
    return apiSuccess(null, "Payment deleted successfully");
  } catch {
    return apiError("Failed to delete payment", 500);
  }
}
