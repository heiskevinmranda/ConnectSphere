import { dashboardService } from "@/modules/dashboard/services/dashboard.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const data = await dashboardService.getSubscriptionAnalytics();
    return apiSuccess(data);
  } catch {
    return apiError("Failed to fetch subscription analytics", 500);
  }
}
