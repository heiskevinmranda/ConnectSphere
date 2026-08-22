import { getBandwidthData } from "@/modules/network/services/network.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const data = getBandwidthData();
    return apiSuccess(data);
  } catch {
    return apiError("Failed to fetch bandwidth data", 500);
  }
}
