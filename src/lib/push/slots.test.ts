import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SLOTS, isSlot, SCHEDULE_TO_SLOT } from "./slots";

type VercelConfig = { crons?: { path: string; schedule: string }[] };

function readCrons() {
  const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
  return (JSON.parse(raw) as VercelConfig).crons ?? [];
}

describe("isSlot", () => {
  test("accepts the three real slots", () => {
    for (const slot of SLOTS) assert.equal(isSlot(slot), true);
  });

  test("rejects anything else", () => {
    assert.equal(isSlot("midnight"), false);
    assert.equal(isSlot(""), false);
    assert.equal(isSlot(null), false);
    assert.equal(isSlot(undefined), false);
  });
});

// The cron route falls back to mapping `x-vercel-cron-schedule` when no slot
// query param survives. That fallback breaks silently if someone retimes a
// job in vercel.json without updating SCHEDULE_TO_SLOT — nothing would throw,
// the route would just start returning 400 at 5am. These tests fail loudly
// instead.
describe("SCHEDULE_TO_SLOT stays in sync with vercel.json", () => {
  test("every configured cron schedule is mapped to a slot", () => {
    for (const cron of readCrons()) {
      assert.ok(
        SCHEDULE_TO_SLOT[cron.schedule],
        `vercel.json schedules "${cron.schedule}" but SCHEDULE_TO_SLOT has no entry for it`
      );
    }
  });

  test("the mapped slot matches the slot in the cron path", () => {
    for (const cron of readCrons()) {
      const expected = new URL(cron.path, "https://example.com").searchParams.get("slot");
      assert.equal(
        SCHEDULE_TO_SLOT[cron.schedule],
        expected,
        `schedule "${cron.schedule}" maps to "${SCHEDULE_TO_SLOT[cron.schedule]}" but its path requests "${expected}"`
      );
    }
  });

  test("all three slots are actually scheduled", () => {
    const scheduled = readCrons().map((cron) => SCHEDULE_TO_SLOT[cron.schedule]);
    for (const slot of SLOTS) {
      assert.ok(scheduled.includes(slot), `no cron entry schedules the "${slot}" slot`);
    }
  });
});
