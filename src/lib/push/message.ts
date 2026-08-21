import type { Slot } from "./slots";

// Pure message construction, deliberately free of any database import so the
// wording can be unit-tested directly — compose.ts pulls in @/db, which opens
// a pg pool at import time. This is the copy the household reads three times
// a day, so its edge cases are worth pinning down.

const MAX_NAMES = 3;

export function nameList(titles: string[]): string {
  const shown = titles.slice(0, MAX_NAMES);
  const remainder = titles.length - shown.length;
  return remainder > 0 ? `${shown.join(", ")} +${remainder} more` : shown.join(", ");
}

export function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export type MessageCounts = {
  overdue: number;
  dueToday: number;
  completedToday: number;
};

export function buildTitle(slot: Slot): string {
  if (slot === "morning") return "Good morning";
  if (slot === "noon") return "Midday check-in";
  return "Before the day ends";
}

export function buildBody(slot: Slot, counts: MessageCounts, titles: string[]): string {
  const { overdue, dueToday, completedToday } = counts;
  const outstanding = overdue + dueToday;
  const names = nameList(titles);

  if (slot === "morning") {
    // Only mention "due today" when something actually is. Saying
    // "1 overdue item, 0 due today" reads like a bug report, not a reminder.
    let summary: string;
    if (overdue > 0 && dueToday > 0) {
      summary = `${plural(overdue, "overdue item")}, ${dueToday} due today`;
    } else if (overdue > 0) {
      summary = plural(overdue, "overdue item");
    } else {
      summary = `${plural(dueToday, "task")} due today`;
    }
    return `${summary} — ${names}`;
  }

  if (slot === "noon") {
    return completedToday > 0
      ? `${plural(completedToday, "task")} done so far. ${outstanding} still to go — ${names}`
      : `${plural(outstanding, "task")} still waiting — ${names}`;
  }

  // Evening. The "(n overdue)" aside is redundant when everything outstanding
  // is overdue, so it's only added when the list is genuinely mixed.
  if (overdue > 0 && dueToday > 0) {
    return `${plural(outstanding, "task")} still unfinished (${overdue} overdue) — ${names}`;
  }
  if (overdue > 0) {
    return `${plural(overdue, "overdue item")} still unresolved — ${names}`;
  }
  return `${plural(outstanding, "task")} left to finish today — ${names}`;
}
