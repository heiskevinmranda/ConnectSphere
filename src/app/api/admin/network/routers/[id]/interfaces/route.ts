import { NextRequest } from "next/server";
import { getRouterInterfaces } from "@/modules/network/services/network.service";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interfaces = getRouterInterfaces(id);
    if (!interfaces) return apiNotFound("Router not found");
    return apiSuccess(interfaces);
  } catch {
    return apiError("Failed to fetch interfaces", 500);
  }
}
