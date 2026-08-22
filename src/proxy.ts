import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifyAdminToken,
  extractTokenFromHeader,
  ADMIN_ROLES,
  type AdminRole,
} from "@/lib/auth";

const PROTECTED_PREFIXES = ["/api/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_PREFIXES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const token = extractTokenFromHeader(request.headers.get("authorization"));
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Access denied. No token provided." },
      { status: 401 }
    );
  }

  try {
    const payload = await verifyAdminToken(token);
    const role = payload.role as AdminRole;
    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, message: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-admin-email", payload.email);
    requestHeaders.set("x-admin-role", role);
    if (payload.sub) requestHeaders.set("x-admin-id", payload.sub);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid or expired token." },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
