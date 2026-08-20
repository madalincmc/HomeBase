import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeNextOccurrence } from "./compute-next-occurrence";

describe("computeNextOccurrence", () => {
  test("daily: adds `interval` days", () => {
    assert.equal(computeNextOccurrence({ frequency: "daily", interval: 1 }, "2026-08-20"), "2026-08-21");
    assert.equal(computeNextOccurrence({ frequency: "daily", interval: 3 }, "2026-08-20"), "2026-08-23");
  });

  test("daily: rolls over a month/year boundary", () => {
    assert.equal(computeNextOccurrence({ frequency: "daily", interval: 1 }, "2026-12-31"), "2027-01-01");
  });

  test("weekly: adds `interval` * 7 days", () => {
    assert.equal(computeNextOccurrence({ frequency: "weekly", interval: 1 }, "2026-01-28"), "2026-02-04");
    assert.equal(computeNextOccurrence({ frequency: "weekly", interval: 2 }, "2026-08-01"), "2026-08-15");
  });

  test("monthly: same day next month, in a normal case", () => {
    assert.equal(computeNextOccurrence({ frequency: "monthly", interval: 1 }, "2026-03-15"), "2026-04-15");
  });

  test("monthly: clamps Jan 31 to Feb 28 in a non-leap year", () => {
    assert.equal(computeNextOccurrence({ frequency: "monthly", interval: 1 }, "2027-01-31"), "2027-02-28");
  });

  test("monthly: clamps Jan 31 to Feb 29 in a leap year", () => {
    assert.equal(computeNextOccurrence({ frequency: "monthly", interval: 1 }, "2028-01-31"), "2028-02-29");
  });

  test("monthly: Dec 31 + 1 month rolls into next January", () => {
    assert.equal(computeNextOccurrence({ frequency: "monthly", interval: 1 }, "2026-12-31"), "2027-01-31");
  });

  test("every_x_months: adds `interval` months with the same clamping as monthly", () => {
    assert.equal(
      computeNextOccurrence({ frequency: "every_x_months", interval: 3 }, "2026-11-30"),
      "2027-02-28"
    );
  });

  test("yearly: same month/day next year, in a normal case", () => {
    assert.equal(computeNextOccurrence({ frequency: "yearly", interval: 1 }, "2026-06-15"), "2027-06-15");
  });

  test("yearly: clamps Feb 29 to Feb 28 when the target year isn't a leap year", () => {
    assert.equal(computeNextOccurrence({ frequency: "yearly", interval: 1 }, "2028-02-29"), "2029-02-28");
  });

  test("yearly: respects the Gregorian century rule (2096 is leap, 2100 is not)", () => {
    assert.equal(computeNextOccurrence({ frequency: "yearly", interval: 4 }, "2096-02-29"), "2100-02-28");
  });

  test("custom: returns null — there's no formula, a person picks the next date", () => {
    assert.equal(computeNextOccurrence({ frequency: "custom", interval: 1 }, "2026-08-20"), null);
  });

  test("throws on a non-positive interval", () => {
    assert.throws(() => computeNextOccurrence({ frequency: "daily", interval: 0 }, "2026-08-20"));
    assert.throws(() => computeNextOccurrence({ frequency: "daily", interval: -1 }, "2026-08-20"));
  });

  test("throws on a non-integer interval", () => {
    assert.throws(() => computeNextOccurrence({ frequency: "monthly", interval: 1.5 }, "2026-08-20"));
  });
});
