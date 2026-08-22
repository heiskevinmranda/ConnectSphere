import { NextRequest } from "next/server";
import { authService } from "@/modules/auth/services/auth.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError("Email and password are required", 400);
    }

    const result = await authService.login(email, password);
    if (!result.success) {
      return apiError(result.message || "Login failed", 401);
    }

    return apiSuccess(result);
  } catch {
    return apiError("Login failed", 500);
  }
}
