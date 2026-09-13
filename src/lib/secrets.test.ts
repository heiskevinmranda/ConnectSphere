import { test } from "node:test";
import assert from "node:assert/strict";
import { constantTimeEqual } from "./secrets";

test("constantTimeEqual returns true for identical strings", () => {
  assert.equal(constantTimeEqual("payload", "payload"), true);
  assert.equal(
    constantTimeEqual(
      "whsec_0123456789abcdef0123456789abcdef",
      "whsec_0123456789abcdef0123456789abcdef"
    ),
    true
  );
});

test("constantTimeEqual returns false for different strings", () => {
  assert.equal(constantTimeEqual("payload", "payloadX"), false);
  assert.equal(
    constantTimeEqual(
      "whsec_0123456789abcdef0123456789abcdef",
      "whsec_0123456789abcdef0123456789abcdee"
    ),
    false
  );
});

test("constantTimeEqual handles empty and differing-length inputs", () => {
  assert.equal(constantTimeEqual("", ""), true);
  assert.equal(constantTimeEqual("", "x"), false);
  assert.equal(constantTimeEqual("abc", "a"), false);
  assert.equal(constantTimeEqual("a", "abc"), false);
});