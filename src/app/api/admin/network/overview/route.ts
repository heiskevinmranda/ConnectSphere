import { getNetworkOverview } from "@/modules/network/services/network.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const data = getNetworkOverview();
    return apiSuccess(data);
  } catch {
    return apiError("Failed to fetch network overview", 500);
  }
}
