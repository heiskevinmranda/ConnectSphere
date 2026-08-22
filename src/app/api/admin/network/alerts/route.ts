import { getMockAlerts } from "@/modules/network/mock/alerts.data";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    return apiSuccess(getMockAlerts());
  } catch {
    return apiError("Failed to fetch alerts", 500);
  }
}
