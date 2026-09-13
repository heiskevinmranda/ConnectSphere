import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { vouchersService } from "@/modules/vouchers/services/vouchers.service";
import { getAdminContext, recordAudit, getAdminId } from "@/lib/audit";
import { canManageSystem } from "@/lib/auth";
import { getClientIp } from "@/lib/rate-limit";
import {
  apiSuccess,
  apiError,
  apiBadRequest,
  apiNotFound,
  apiConflict,
  apiForbidden,
} from "@/lib/api-response";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getAdminContext(request.headers);
  if (!ctx) return apiError("Missing admin context", 401);

  // Destroying sellable inventory is a super-admin action.
  if (!canManageSystem(ctx.role)) {
    return apiForbidden(
      "Only super administrators can delete vouchers."
    );
  }

  try {
    const { id } = await params;
    const voucherId = parseInt(id);
    if (isNaN(voucherId)) return apiBadRequest("Invalid voucher ID");

    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
    });
    if (!voucher) return apiNotFound("Voucher not found");

    // Used vouchers carry subscription history and are retained.
    if (voucher.isUsed || voucher.subscriptionId !== null) {
      return apiConflict(
        "This voucher is already used or assigned and cannot be deleted."
      );
    }

    await vouchersService.deleteIfUnused(voucherId);

    await recordAudit({
      actor: ctx.email,
      action: "voucher.delete",
      target: voucher.code,
      details: { id: voucher.id, price: voucher.price },
      adminId: getAdminId(request.headers),
      ip: getClientIp(request),
    });

    return apiSuccess(null, "Voucher deleted successfully");
  } catch (error) {
    console.error("[vouchers] delete failed:", error);
    return apiError("Failed to delete voucher", 500);
  }
}
