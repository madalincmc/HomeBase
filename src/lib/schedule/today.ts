import type { DateOnly } from "./compute-next-occurrence";

// UTC, to match how the rest of this module treats calendar dates — see
// compute-next-occurrence.ts. Plain string comparison ("<", ">", "===")
// works correctly on DateOnly values since they're zero-padded YYYY-MM-DD.
export function todayDateOnly(): DateOnly {
  return new Date().toISOString().slice(0, 10);
}
