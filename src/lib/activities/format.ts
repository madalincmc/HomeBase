const formatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// activities.occurredAt is a real timestamptz, unlike the DateOnly strings
// used everywhere else in this app (schedules, due dates) — it has a true
// point-in-time meaning, so it's formatted in the viewer's local timezone
// rather than pinned to UTC the way formatDateOnlyLabel deliberately is.
export function formatActivityTimestamp(date: Date): string {
  return formatter.format(date);
}
