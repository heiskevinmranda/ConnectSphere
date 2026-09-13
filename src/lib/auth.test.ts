import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractTokenFromHeader,
  canManageSystem,
  generateAdminToken,
  verifyAdminToken,
} from "./auth";

test("extractTokenFromHeader parses bearer tokens", () => {
  assert.equal(extractTokenFromHeader("Bearer abc123"), "abc123");
  assert.equal(extractTokenFromHeader("Bearer   spaced "), "spaced");
  assert.equal(extractTokenFromHeader("bearer abc"), null);
  assert.equal(extractTokenFromHeader("Bearer"), null);
  assert.equal(extractTokenFromHeader(null), null);
  assert.equal(extractTokenFromHeader(undefined), null);
});

test("canManageSystem only allows super_admin", () => {
  assert.equal(canManageSystem("super_admin"), true);
  assert.equal(canManageSystem("admin"), false);
  assert.equal(canManageSystem("anything"), false);
});

test("JWT secret validation rejects placeholders and weak secrets", async () => {
  const original = process.env.JWT_SECRET;

  const weakSecrets = [
    "changeme", // placeholder word, too short
    "0123456789012345678901234567890123456789012345678901234567890123", // digits only
  ];
  for (const secret of weakSecrets) {
    process.env.JWT_SECRET = secret;
    await assert.rejects(() => generateAdminToken("a@b.c", 1), /JWT_SECRET/);
  }

  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET =
    "S0me-rAnd0m_V3ry-Str0ng-Secret-Value-2024!base64url";
  const token = await generateAdminToken("admin@connectsphere.co.tz", 7, "super_admin");
  assert.ok(typeof token === "string" && token.split(".").length === 3);
  const payload = await verifyAdminToken(token);
  assert.equal(payload.email, "admin@connectsphere.co.tz");
  assert.equal(payload.role, "super_admin");
  assert.equal(payload.sub, "7");

  process.env.JWT_SECRET = original ?? originalSecret;
});

test("verifyAdminToken rejects tokens signed with a different secret", async () => {
  const original = process.env.JWT_SECRET;
  process.env.JWT_SECRET =
    "K3y-0ne-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA!";
  const token = await generateAdminToken("a@b.c", 1);
  process.env.JWT_SECRET =
    "K3y-tw0-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB!";
  await assert.rejects(() => verifyAdminToken(token));
  process.env.JWT_SECRET = original;
});