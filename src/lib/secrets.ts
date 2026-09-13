import crypto from "crypto";

/**
 * Constant-time string comparison safe against timing attacks.
 * Both inputs are hashed first so their lengths never leak and
 * timingSafeEqual always receives equal-length buffers.
 */
export function constantTimeEqual(actual: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(actual).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}