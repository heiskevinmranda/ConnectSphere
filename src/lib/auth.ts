import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const ADMIN_ROLES = ["admin", "super_admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

const PLACEHOLDER_PATTERN =
  /^\s*(change[-_ ]?me|changeme|example|your[-_ ]|replace|secret|jwt[-_ ]?secret|dummy|test)/i;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  assertStrongSecret(secret);
  return new TextEncoder().encode(secret);
}

function assertStrongSecret(secret: string | undefined): asserts secret is string {
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  if (secret.length < 32) {
    throw new Error(
      "JWT_SECRET is too short (minimum 32 characters). Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\""
    );
  }
  if (PLACEHOLDER_PATTERN.test(secret)) {
    throw new Error(
      "JWT_SECRET looks like a placeholder. Replace it with a strong random value before deploying."
    );
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(secret)
  );
  if (classes.length < 3) {
    throw new Error(
      "JWT_SECRET must combine letters, digits, and symbols/uppercase."
    );
  }
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
