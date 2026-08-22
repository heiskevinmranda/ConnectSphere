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
    const subId = parseInt(id);
    if (isNaN(subId)) return apiBadRequest("Invalid subscription ID");

    const deleted = await customersService.deleteSubscription(subId);
    if (!deleted) return apiNotFound("Subscription not found");

    cache.delete("dashboard-stats");
    return apiSuccess(null, "Subscription deleted successfully");
  } catch {
    return apiError("Failed to delete subscription", 500);
  }
}
