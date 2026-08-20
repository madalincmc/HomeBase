import type { DateOnly } from "./compute-next-occurrence";

const formatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC", // the DateOnly string has no time/timezone of its own — treat it as UTC
  // to display consistently regardless of the viewer's local timezone.
});

export function formatDateOnlyLabel(date: DateOnly): string {
  return formatter.format(new Date(`${date}T00:00:00Z`));
}
