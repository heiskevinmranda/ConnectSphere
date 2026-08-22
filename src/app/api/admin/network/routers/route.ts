import { MOCK_ROUTERS } from "@/modules/network/mock/routers.data";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const data = MOCK_ROUTERS.map(({ interfaces, ...rest }) => rest);
    return apiSuccess(data);
  } catch {
    return apiError("Failed to fetch routers", 500);
  }
}
