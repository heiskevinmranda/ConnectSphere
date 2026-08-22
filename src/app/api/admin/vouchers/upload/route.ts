import { NextRequest } from "next/server";
import { vouchersService } from "@/modules/vouchers/services/vouchers.service";
import { voucherUploadSchema } from "@/modules/vouchers/schemas/vouchers.schema";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = voucherUploadSchema.safeParse(body);

    if (!parsed.success) {
      return apiBadRequest(
        "Validation failed",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const result = await vouchersService.upload(parsed.data.vouchers);
    return apiSuccess(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload vouchers";
    return apiError(message, 500);
  }
}
