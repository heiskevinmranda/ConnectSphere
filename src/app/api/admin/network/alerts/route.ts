import { networkService } from "@/modules/network/services/network.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const data = await networkService.getAlerts();
    return apiSuccess(data);
  } catch {
    return apiError("Failed to fetch alerts", 500);
  }
}