import { NextRequest } from "next/server";
import { getRouterById } from "@/modules/network/services/network.service";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const router = getRouterById(id);
    if (!router) return apiNotFound("Router not found");
    return apiSuccess(router);
  } catch {
    return apiError("Failed to fetch router", 500);
  }
}
