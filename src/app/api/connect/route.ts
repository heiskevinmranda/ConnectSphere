import { NextRequest } from "next/server";
import { routerAccessService } from "@/modules/network/services/router-access.service";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  // Called continuously by routers/captive portals; both IP and phone
  // limits stop enumeration without breaking legitimate polling.
  if (!rateLimit(`connect:ip:${ip}`, 600, 60).allowed) {
    return apiError("Too many connection checks. Try again shortly.", 429);
  }

  try {
    const url = new URL(request.url);
    const phoneNumber = url.searchParams.get("phoneNumber");
    const macAddress = url.searchParams.get("macAddress") || undefined;
    const imei = url.searchParams.get("imei") || undefined;

    if (!phoneNumber || !/^\+255\d{9}$/.test(phoneNumber)) {
      return apiBadRequest("Invalid phone number format");
    }

    if (!rateLimit(`connect:phone:${phoneNumber}`, 120, 60).allowed) {
      return apiError("Too many connection checks. Try again shortly.", 429);
    }

    const result = await routerAccessService.checkAccess(
      phoneNumber,
      macAddress,
      imei
    );
    if (result.success) {
      return apiSuccess(result);
    }
    return apiError(result.message || "Access denied", 403);
  } catch {
    return apiError("Connection check failed", 500);
  }
}