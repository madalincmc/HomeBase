import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildBody, buildTitle, nameList, plural } from "./message";

const NAMES = ["Water bill", "Meter reading", "Trash"];

describe("plural / nameList", () => {
  test("singular vs plural", () => {
    assert.equal(plural(1, "task"), "1 task");
    assert.equal(plural(2, "task"), "2 tasks");
    assert.equal(plural(1, "overdue item"), "1 overdue item");
    assert.equal(plural(0, "task"), "0 tasks");
  });

  test("caps the list and counts the remainder", () => {
    assert.equal(nameList(["a"]), "a");
    assert.equal(nameList(["a", "b", "c"]), "a, b, c");
    assert.equal(nameList(["a", "b", "c", "d", "e"]), "a, b, c +2 more");
  });
});

describe("buildTitle", () => {
  test("differs per slot", () => {
    assert.equal(buildTitle("morning"), "Good morning");
    assert.equal(buildTitle("noon"), "Midday check-in");
    assert.equal(buildTitle("evening"), "Before the day ends");
  });
});

describe("morning wording", () => {
  test("mentions both when the day is genuinely mixed", () => {
    const body = buildBody("morning", { overdue: 1, dueToday: 2, completedToday: 0 }, NAMES);
    assert.match(body, /^1 overdue item, 2 due today — /);
  });

  // Regression: this previously rendered "1 overdue item, 0 due today", which
  // reads like a bug rather than a reminder. Caught during MAD-119 QA.
  test("omits 'due today' entirely when nothing is due today", () => {
    const body = buildBody("morning", { overdue: 1, dueToday: 0, completedToday: 0 }, ["Water bill"]);
    assert.equal(body, "1 overdue item — Water bill");
    assert.doesNotMatch(body, /0 due today/);
  });

  test("omits overdue when there is none", () => {
    const body = buildBody("morning", { overdue: 0, dueToday: 3, completedToday: 0 }, NAMES);
    assert.equal(body, "3 tasks due today — Water bill, Meter reading, Trash");
    assert.doesNotMatch(body, /overdue/);
  });
});

describe("noon wording", () => {
  test("reports progress once something has been done", () => {
    const body = buildBody("noon", { overdue: 0, dueToday: 2, completedToday: 3 }, NAMES);
    assert.match(body, /^3 tasks done so far\. 2 still to go — /);
  });

  test("falls back to a plain waiting count with no progress yet", () => {
    const body = buildBody("noon", { overdue: 1, dueToday: 1, completedToday: 0 }, NAMES);
    assert.match(body, /^2 tasks still waiting — /);
  });
});

describe("evening wording", () => {
  test("adds the overdue aside only for a mixed list", () => {
    const body = buildBody("evening", { overdue: 1, dueToday: 2, completedToday: 0 }, NAMES);
    assert.match(body, /^3 tasks still unfinished \(1 overdue\) — /);
  });

  // "1 task still unfinished (1 overdue)" says the same thing twice.
  test("drops the redundant aside when everything left is overdue", () => {
    const body = buildBody("evening", { overdue: 2, dueToday: 0, completedToday: 0 }, NAMES);
    assert.equal(body, "2 overdue items still unresolved — Water bill, Meter reading, Trash");
    assert.doesNotMatch(body, /\(2 overdue\)/);
  });

  test("plain count when nothing is overdue", () => {
    const body = buildBody("evening", { overdue: 0, dueToday: 1, completedToday: 0 }, ["Trash"]);
    assert.equal(body, "1 task left to finish today — Trash");
  });
});
