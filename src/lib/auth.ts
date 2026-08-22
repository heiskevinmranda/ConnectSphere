import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const ADMIN_ROLES = ["admin", "super_admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET is not configured or is too weak (minimum 16 characters)"
    );
  }
  return new TextEncoder().encode(secret);
}

export interface AdminJWTPayload extends JWTPayload {
  email: string;
  role: AdminRole;
  sub?: string;
}

export async function generateAdminToken(
  email: string,
  adminId: number,
  role: AdminRole = "admin"
): Promise<string> {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(adminId))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getJwtSecret());
}

export async function verifyAdminToken(
  token: string
): Promise<AdminJWTPayload> {
  const { payload } = await jwtVerify<AdminJWTPayload>(token, getJwtSecret());
  if (
    typeof payload.email !== "string" ||
    !ADMIN_ROLES.includes(payload.role as AdminRole)
  ) {
    throw new Error("Invalid token payload");
  }
  return payload;
}

export function extractTokenFromHeader(
  authorization: string | null | undefined
): string | null {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/** Roles allowed to perform destructive/administrative actions. */
export function canManageSystem(role: string): boolean {
  return role === "super_admin";
}
