import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/audit";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const ctx = getAdminContext(request.headers);
    if (!ctx) return apiError("Missing admin context", 401);

    const admin = await prisma.admin.findUnique({
      where: { email: ctx.email },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    if (!admin) return apiError("Account not found", 404);

    return apiSuccess(admin);
  } catch {
    return apiError("Failed to load account", 500);
  }
}
