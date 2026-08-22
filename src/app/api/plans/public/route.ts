import { plansService } from "@/modules/plans/services/plans.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const plans = await plansService.listActive();
    return apiSuccess(plans);
  } catch {
    return apiError("Failed to fetch plans", 500);
  }
}
