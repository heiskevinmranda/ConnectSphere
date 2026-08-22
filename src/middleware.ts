import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken, extractTokenFromHeader } from "@/lib/auth";

const ADMIN_ROUTES = ["/api/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin API routes
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    const token = extractTokenFromHeader(
      request.headers.get("authorization")
    );

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Access denied. No token provided." },
        { status: 401 }
      );
    }

    try {
      const payload = await verifyAdminToken(token);
      if (payload.role !== "admin" && payload.role !== "super_admin") {
        return NextResponse.json(
          { success: false, message: "Access denied. Admin privileges required." },
          { status: 403 }
        );
      }

      // Add admin info to headers for downstream use
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-admin-email", payload.email as string);
      requestHeaders.set("x-admin-role", payload.role as string);

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
