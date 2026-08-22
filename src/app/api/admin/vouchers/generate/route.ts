import { NextRequest } from "next/server";
import { vouchersService } from "@/modules/vouchers/services/vouchers.service";
import { voucherGenerateSchema } from "@/modules/vouchers/schemas/vouchers.schema";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = voucherGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return apiBadRequest(
        "Validation failed",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const result = await vouchersService.generate(
      parsed.data.count,
      parsed.data.price
    );
    return apiSuccess(result);
  } catch {
    return apiError("Failed to generate vouchers", 500);
  }
}
