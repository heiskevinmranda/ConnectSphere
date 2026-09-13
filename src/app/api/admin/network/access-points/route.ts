import { networkService } from "@/modules/network/services/network.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const data = await networkService.getDevices("access_point");
    return apiSuccess(data);
  } catch {
    return apiError("Failed to fetch access points", 500);
  }
}