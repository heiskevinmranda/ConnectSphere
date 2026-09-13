import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePhone,
  detectMNOProvider,
  formatDuration,
  formatCurrency,
  formatRemainingTime,
} from "./utils";

test("normalizePhone standardizes Tanzanian inputs", () => {
  assert.equal(normalizePhone("0712 345 678"), "+255712345678");
  assert.equal(normalizePhone("712345678"), "+255712345678");
  assert.equal(normalizePhone("+255 712 345 678"), "+255712345678");
  assert.equal(normalizePhone("(0712) 345-678"), "+255712345678");
});

test("detectMNOProvider maps the TCRA prefixes correctly", () => {
  const cases: Array<[string, string]> = [
    ["+255611234567", "halotel"], // Halotel 61
    ["+255651234567", "tigo"], // Tigo 65
    ["+255671234567", "tigo"], // Tigo 67
    ["+255711234567", "tigo"], // Tigo 71
    ["+255771234567", "tigo"], // Tigo 77
    ["+255681234567", "airtel"], // Airtel 68
    ["+255691234567", "airtel"], // Airtel 69
    ["+255781234567", "airtel"], // Airtel 78
    ["+255741234567", "mpesa"], // Vodacom 74
    ["+255751234567", "mpesa"], // Vodacom 75
    ["+255761234567", "mpesa"], // Vodacom 76
    ["+255791234567", "mpesa"], // Vodacom 79
    ["+255661234567", "smile"], // Smile 66
    ["+255731234567", "ttcl"], // TTCL 73
  ];
  for (const [number, slug] of cases) {
    assert.equal(detectMNOProvider(number).slug, slug, `${number} -> ${slug}`);
  }
});

test("detectMNOProvider returns unknown for unassigned prefixes", () => {
  assert.equal(detectMNOProvider("+255621234567").slug, "unknown");
  assert.equal(detectMNOProvider("+255601234567").slug, "unknown");
});

test("formatDuration produces human labels", () => {
  assert.equal(formatDuration(1), "1 Day");
  assert.equal(formatDuration(7), "1 Week");
  assert.equal(formatDuration(14), "2 Weeks");
  assert.equal(formatDuration(30), "1 Month");
  assert.equal(formatDuration(3), "3 Days");
});

test("formatCurrency groups thousands with TSh", () => {
  assert.equal(formatCurrency(5000), "TSh 5,000");
  assert.equal(formatCurrency(20000), "TSh 20,000");
});

test("formatRemainingTime favours the largest unit", () => {
  const slightlyUnderTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 - 60 * 1000);
  assert.equal(formatRemainingTime(slightlyUnderTwoDays), "2 days");
  const fiveHours = new Date(Date.now() + 5 * 60 * 60 * 1000 - 60 * 1000);
  assert.equal(formatRemainingTime(fiveHours), "5 hours");
  const past = new Date(Date.now() - 1000);
  assert.equal(formatRemainingTime(past), "Less than 1 hour");
});