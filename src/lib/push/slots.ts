// Deliberately dependency-free. compose.ts pulls in @/db (which opens a pg
// pool at import time), so the slot constants live here instead — that keeps
// them importable from a plain unit test, and from anywhere else that must
// not drag the database driver along. Same reasoning as the @/lib/schedule
// barrel note in CLAUDE.md.

export const SLOTS = ["morning", "noon", "evening"] as const;
export type Slot = (typeof SLOTS)[number];

export function isSlot(value: string | null | undefined): value is Slot {
  return SLOTS.includes(value as Slot);
}

// Maps the cron expression Vercel reports in `x-vercel-cron-schedule` back to
// a slot, so all three jobs can share one route even if the query string
// isn't preserved through cron invocation. Kept honest by slots.test.ts,
// which asserts this matches vercel.json.
export const SCHEDULE_TO_SLOT: Record<string, Slot> = {
  "0 5 * * *": "morning",
  "0 9 * * *": "noon",
  "0 16 * * *": "evening",
};
