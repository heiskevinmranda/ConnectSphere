import { NextRequest } from "next/server";
import {
  customersService,
  CUSTOMER_STATUSES,
} from "@/modules/customers/services/customers.service";
import { z } from "zod";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";

const listQuerySchema = z.object({
  status: z.enum(CUSTOMER_STATUSES).default("all"),
  plan: z.string().trim().max(64).optional(),
  search: z.string().trim().max(20).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      plan: url.searchParams.get("plan") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return apiBadRequest(
        "Invalid query parameters",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const result = await customersService.list(parsed.data);
    return apiSuccess(result);
  } catch (error) {
    console.error("[customers] list failed:", error);
    return apiError("Failed to fetch users", 500);
  }
}
