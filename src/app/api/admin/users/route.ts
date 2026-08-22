import { NextRequest } from "next/server";
import { customersService } from "@/modules/customers/services/customers.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const plan = url.searchParams.get("plan") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const result = await customersService.list({ status, plan, search, page, limit });
    return apiSuccess(result);
  } catch {
    return apiError("Failed to fetch users", 500);
  }
}
