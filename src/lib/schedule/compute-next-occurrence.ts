import type { scheduleFrequencyEnum } from "@/db/schema";

export type ScheduleFrequency = (typeof scheduleFrequencyEnum.enumValues)[number];

export type ScheduleRule = {
  frequency: ScheduleFrequency;
  interval: number;
};

/** A Postgres `date` column, as returned by Drizzle: "YYYY-MM-DD", no time or timezone. */
export type DateOnly = string;

type YMD = { year: number; month: number; day: number };

function parseDateOnly(date: DateOnly): YMD {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function formatDateOnly({ year, month, day }: YMD): DateOnly {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the following month is the last day of `month` (1-indexed).
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// All arithmetic below stays in UTC and never constructs a Date from a
// timezone-sensitive string, so a fixed calendar date in Postgres can never
// drift by a day depending on the server's local timezone.

function addDays({ year, month, day }: YMD, days: number): YMD {
  const d = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

// Adds whole months, clamping the day to the target month's length — e.g.
// Jan 31 + 1 month -> Feb 28 (or 29 in a leap year), not Mar 3.
function addMonthsClamped({ year, month, day }: YMD, months: number): YMD {
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  return { year: nextYear, month: nextMonth, day: Math.min(day, daysInMonth(nextYear, nextMonth)) };
}

// Same clamping idea as addMonthsClamped, for the Feb 29 -> Feb 28 case when
// the target year isn't a leap year.
function addYearsClamped({ year, month, day }: YMD, years: number): YMD {
  const nextYear = year + years;
  return { year: nextYear, month, day: Math.min(day, daysInMonth(nextYear, month)) };
}

/**
 * Computes the next occurrence date for a schedule, given the date the
 * previous occurrence was scheduled for (not when it was completed — a bill
 * due on the 15th stays anchored to the 15th regardless of when it's paid).
 *
 * Returns null for "custom" schedules: there's no formula to compute from,
 * the next date has to be chosen by a person.
 */
export function computeNextOccurrence(rule: ScheduleRule, fromDate: DateOnly): DateOnly | null {
  if (!Number.isInteger(rule.interval) || rule.interval < 1) {
    throw new Error(`Schedule interval must be a positive integer, got ${rule.interval}`);
  }

  const from = parseDateOnly(fromDate);

  switch (rule.frequency) {
    case "daily":
      return formatDateOnly(addDays(from, rule.interval));
    case "weekly":
      return formatDateOnly(addDays(from, rule.interval * 7));
    case "monthly":
    case "every_x_months":
      return formatDateOnly(addMonthsClamped(from, rule.interval));
    case "yearly":
      return formatDateOnly(addYearsClamped(from, rule.interval));
    case "custom":
      return null;
    default: {
      const exhaustive: never = rule.frequency;
      throw new Error(`Unknown schedule frequency: ${exhaustive}`);
    }
  }
}
