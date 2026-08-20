import type { DateOnly } from "./compute-next-occurrence";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Native <input type="date"> elements can be coaxed (whether by a user's
// browser autofill quirk or, as found during testing, mis-targeted
// automated typing) into submitting something that isn't a real calendar
// date — Postgres's `date` column will happily store nonsense like
// "152026-08-07" as a string. Validate at this boundary rather than
// trusting the browser.
export function isValidDateOnly(value: string): value is DateOnly {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
