import { networkService } from "@/modules/network/services/network.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const data = await networkService.getOverview();
    return apiSuccess(data);
  } catch (error) {
    console.error("[network/overview] failed:", error);
    return apiError("Failed to fetch network overview", 500);
  }
}