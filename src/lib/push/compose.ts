import { eq, and, gte } from "drizzle-orm";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { getDueItems } from "@/lib/dashboard/get-due-items";
import { todayDateOnly } from "@/lib/schedule";
import type { PushPayload } from "./send";
import type { Slot } from "./slots";
import { buildBody, buildTitle } from "./message";

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
  // Only the noon slot needs this, so don't pay for the query otherwise.
  const completedToday = slot === "noon" ? await countCompletedToday(householdId) : 0;

  return {
    title: buildTitle(slot),
    body: buildBody(
      slot,
      { overdue: overdue.length, dueToday: dueToday.length, completedToday },
      outstanding.map((item) => item.title)
    ),
    url,
    tag: "homebase-reminder",
  };
}
