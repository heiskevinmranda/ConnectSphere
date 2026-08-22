import { NextRequest, NextResponse } from "next/server";
import {
  customersService,
  CUSTOMER_STATUSES,
} from "@/modules/customers/services/customers.service";
import { getAdminContext, recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { apiBadRequest, apiError } from "@/lib/api-response";

const exportQuerySchema = z.object({
  status: z.enum(CUSTOMER_STATUSES).default("all"),
  plan: z.string().trim().max(64).optional(),
  search: z.string().trim().max(20).optional(),
});

function csvEscape(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(request: NextRequest) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiError("Missing admin context", 401);

  try {
    const url = new URL(request.url);
    const parsed = exportQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      plan: url.searchParams.get("plan") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    });
    if (!parsed.success) {
      return apiBadRequest(
        "Invalid query parameters",
        parsed.error.issues.map((e) => e.message)
      );
    }

    const rows = await customersService.exportRows(parsed.data);

    const header =
      "phone,plan,status,amount,start,end,voucher,type,paymentReference";
    const body = rows
      .map((u) =>
        [
          csvEscape(u.phoneNumber),
          csvEscape(u.plan),
          u.status,
          u.amount,
          u.startDate ? u.startDate.toISOString() : "",
          u.endDate ? u.endDate.toISOString() : "",
          csvEscape(u.voucherCode),
          u.type,
          csvEscape(u.paymentReference),
        ].join(",")
      )
      .join("\r\n");

    await recordAudit({
      actor: ctx.email,
      action: "customer.export",
      details: { count: rows.length, ...parsed.data },
      ip: getClientIp(request),
    });

    return new NextResponse(`${header}\r\n${body}\r\n`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="customers-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("[customers] export failed:", error);
    return apiError("Failed to export customers", 500);
  }
}
