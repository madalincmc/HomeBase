import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeReadingValue } from "./normalize-reading-value";

describe("normalizeReadingValue", () => {
  test("strips leading zeros", () => {
    assert.equal(normalizeReadingValue("04855"), "4855");
  });

  test("drops everything after a decimal comma", () => {
    assert.equal(normalizeReadingValue("04855,15"), "4855");
  });

  test("drops everything after a decimal point", () => {
    assert.equal(normalizeReadingValue("04855.15"), "4855");
  });

  // The exact case found on a real meter photo.
  test("handles a doubled separator", () => {
    assert.equal(normalizeReadingValue("04855,,15"), "4855");
  });

  test("leaves a value with no leading zeros or decimal untouched", () => {
    assert.equal(normalizeReadingValue("4855"), "4855");
  });

  test("collapses an all-zero whole part to a single zero", () => {
    assert.equal(normalizeReadingValue("000"), "0");
    assert.equal(normalizeReadingValue("000,45"), "0");
  });

  test("returns null for an empty or non-numeric value", () => {
    assert.equal(normalizeReadingValue(""), null);
    assert.equal(normalizeReadingValue("   "), null);
    assert.equal(normalizeReadingValue("n/a"), null);
  });
});
