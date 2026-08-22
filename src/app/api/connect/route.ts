import { NextRequest } from "next/server";
import { routerAccessService } from "@/modules/network/services/router-access.service";
import { apiSuccess, apiError, apiBadRequest } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const phoneNumber = url.searchParams.get("phoneNumber");
    const macAddress = url.searchParams.get("macAddress") || undefined;
    const imei = url.searchParams.get("imei") || undefined;

    if (!phoneNumber || !/^\+255\d{9}$/.test(phoneNumber)) {
      return apiBadRequest("Invalid phone number format");
    }

    const result = await routerAccessService.checkAccess(phoneNumber, macAddress, imei);
    if (result.success) {
      return apiSuccess(result);
    }
    return apiError(result.message || "Access denied", 403);
  } catch {
    return apiError("Connection check failed", 500);
  }
}
