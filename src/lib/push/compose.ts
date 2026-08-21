import { eq, and, gte } from "drizzle-orm";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { getDueItems, type DueItem } from "@/lib/dashboard/get-due-items";
import { todayDateOnly } from "@/lib/schedule";
import type { PushPayload } from "./send";
import type { Slot } from "./slots";

const MAX_NAMES = 3;

function nameList(items: DueItem[]): string {
  const names = items.slice(0, MAX_NAMES).map((item) => item.title);
  const remainder = items.length - names.length;
  return remainder > 0 ? `${names.join(", ")} +${remainder} more` : names.join(", ");
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

async function countCompletedToday(householdId: string): Promise<number> {
  const startOfToday = new Date(`${todayDateOnly()}T00:00:00.000Z`);
  const rows = await db
    .select({ id: activities.id })
    .from(activities)
    .where(and(eq(activities.householdId, householdId), gte(activities.occurredAt, startOfToday)));
  return rows.length;
}

// Returns null when there's nothing outstanding — the caller sends nothing
// rather than an empty "all clear" push. Three silent days beat three
// notifications a day that train you to ignore them.
export async function composeSlotPayload(
  householdId: string,
  slot: Slot
): Promise<PushPayload | null> {
  const dueItems = await getDueItems();
  const overdue = dueItems.filter((item) => item.bucket === "overdue");
  const dueToday = dueItems.filter((item) => item.bucket === "dueToday");
  const outstanding = [...overdue, ...dueToday];

  if (outstanding.length === 0) return null;

  // A single item links straight to the thing; a mixed list has no one
  // sensible destination, so it opens the dashboard.
  const url = outstanding.length === 1 ? outstanding[0].href : "/";
  const names = nameList(outstanding);

  if (slot === "morning") {
    const body =
      overdue.length > 0
        ? `${plural(overdue.length, "overdue item")}, ${dueToday.length} due today — ${names}`
        : `${plural(dueToday.length, "task")} due today — ${names}`;
    return { title: "Good morning", body, url, tag: "homebase-reminder" };
  }

  if (slot === "noon") {
    const completed = await countCompletedToday(householdId);
    const body =
      completed > 0
        ? `${plural(completed, "task")} done so far. ${outstanding.length} still to go — ${names}`
        : `${plural(outstanding.length, "task")} still waiting — ${names}`;
    return { title: "Midday check-in", body, url, tag: "homebase-reminder" };
  }

  const body =
    overdue.length > 0
      ? `${plural(outstanding.length, "task")} still unfinished (${overdue.length} overdue) — ${names}`
      : `${plural(outstanding.length, "task")} left to finish today — ${names}`;
  return { title: "Before the day ends", body, url, tag: "homebase-reminder" };
}
