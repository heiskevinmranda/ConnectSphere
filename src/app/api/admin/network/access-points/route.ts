import { MOCK_ACCESS_POINTS } from "@/modules/network/mock/access-points.data";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    return apiSuccess(MOCK_ACCESS_POINTS);
  } catch {
    return apiError("Failed to fetch access points", 500);
  }
}
