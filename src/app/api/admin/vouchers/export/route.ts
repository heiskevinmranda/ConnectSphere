import { NextRequest, NextResponse } from "next/server";
import { vouchersService } from "@/modules/vouchers/services/vouchers.service";
import { voucherExportQuerySchema } from "@/modules/vouchers/schemas/vouchers.schema";
import { getAdminContext, recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { apiBadRequest, apiError } from "@/lib/api-response";

function csvEscape(value: string | number | boolean | null): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiError("Missing admin context", 401);

  try {
    const url = new URL(request.url);
    const parsed = voucherExportQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      price: url.searchParams.get("price") ?? undefined,
    });
    if (!parsed.success) {
      return apiBadRequest(
        "Invalid query parameters",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const rows = await vouchersService.exportRows(parsed.data);

    const header = "code,price,status,subscriptionId,createdAt";
    const body = rows
      .map((r) =>
        [
          csvEscape(r.code),
          r.price,
          r.isUsed ? "used" : "available",
          r.subscriptionId ?? "",
          r.createdAt.toISOString(),
        ].join(",")
      )
      .join("\r\n");

    await recordAudit({
      actor: ctx.email,
      action: "voucher.export",
      details: { count: rows.length, ...parsed.data },
      ip: getClientIp(request),
    });

    return new NextResponse(`${header}\r\n${body}\r\n`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vouchers-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("[vouchers] export failed:", error);
    return apiError("Failed to export vouchers", 500);
  }
}
