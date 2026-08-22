import { NextRequest } from "next/server";
import { vouchersService } from "@/modules/vouchers/services/vouchers.service";
import { voucherListQuerySchema } from "@/modules/vouchers/schemas/vouchers.schema";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const parsed = voucherListQuerySchema.safeParse({
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      price: url.searchParams.get("price") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    });
    if (!parsed.success) {
      return apiBadRequest(
        "Invalid query parameters",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const result = await vouchersService.list(parsed.data);
    return apiSuccess(result);
  } catch (error) {
    console.error("[vouchers] list failed:", error);
    return apiError("Failed to fetch vouchers", 500);
  }
}
