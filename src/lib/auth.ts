import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "My$ecureT0ken123!"
);

export interface AdminJWTPayload extends JWTPayload {
  email: string;
  role: "admin" | "super_admin" | "network_admin" | "finance" | "support";
}

export async function generateAdminToken(
  email: string,
  role: string = "admin"
): Promise<string> {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(JWT_SECRET);
}

export async function verifyAdminToken(
  token: string
): Promise<AdminJWTPayload> {
  const { payload } = await jwtVerify<AdminJWTPayload>(token, JWT_SECRET);
  return payload;
}

export function extractTokenFromHeader(
  authorization: string | null | undefined
): string | null {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }
  return authorization.split(" ")[1];
}
