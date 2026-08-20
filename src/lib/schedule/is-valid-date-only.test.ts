import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isValidDateOnly } from "./is-valid-date-only";

describe("isValidDateOnly", () => {
  test("accepts a well-formed calendar date", () => {
    assert.equal(isValidDateOnly("2026-08-20"), true);
  });

  test("accepts Feb 29 in a leap year", () => {
    assert.equal(isValidDateOnly("2028-02-29"), true);
  });

  test("rejects Feb 29 in a non-leap year", () => {
    assert.equal(isValidDateOnly("2027-02-29"), false);
  });

  test("rejects a day that doesn't exist in the month", () => {
    assert.equal(isValidDateOnly("2026-04-31"), false);
  });

  test("rejects a month out of range", () => {
    assert.equal(isValidDateOnly("2026-13-01"), false);
  });

  // The exact bug found in testing: a native date input somehow produced a
  // 6-digit year instead of 4.
  test("rejects a malformed year, e.g. from a mis-entered date input", () => {
    assert.equal(isValidDateOnly("152026-08-07"), false);
  });

  test("rejects a non-date string", () => {
    assert.equal(isValidDateOnly("not-a-date"), false);
    assert.equal(isValidDateOnly(""), false);
  });

  test("rejects a value with a time component", () => {
    assert.equal(isValidDateOnly("2026-08-20T00:00:00Z"), false);
  });
});
