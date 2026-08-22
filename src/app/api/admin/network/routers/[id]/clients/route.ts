import { NextRequest } from "next/server";
import { getRouterClients } from "@/modules/network/services/network.service";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clients = getRouterClients(id);
    if (!clients) return apiNotFound("Router not found");
    return apiSuccess(clients);
  } catch {
    return apiError("Failed to fetch clients", 500);
  }
}
