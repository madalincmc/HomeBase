import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { getDueItems, type DueItemKind } from "@/lib/dashboard/get-due-items";
import type { DateOnly } from "@/lib/schedule";

// The five kinds getDueItems() can produce map 1:1 onto notification
// categories — "general" is reserved for any future non-schedule-derived
// notification and is deliberately never touched by this sync (see the
// filter below), so it can't be created or deleted here.
const SCHEDULE_DERIVED_CATEGORIES = [
  "bill",
  "chore",
  "maintenance",
  "utility",
  "warranty",
] as const satisfies readonly DueItemKind[];

function dueDateToTimestamp(dueDate: DateOnly): Date {
  return new Date(`${dueDate}T00:00:00.000Z`);
}

// No cron/scheduled-task infra exists yet (same constraint noted for bills'
// display status and utilities' next-reading-due) — so instead of a
// background job writing these rows on a schedule, this runs inline
// whenever the notification center is read, reconciling the notifications
// table against the same overdue/due-today/upcoming computation the
// dashboard uses. Cheap enough at single-household MVP scale.
export async function syncNotifications(): Promise<void> {
  const household = await getOrCreateHousehold();
  const dueItems = await getDueItems();

  const existing = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.householdId, household.id),
        inArray(notifications.category, SCHEDULE_DERIVED_CATEGORIES)
      )
    );
  const existingByKey = new Map(existing.map((n) => [`${n.relatedEntityType}:${n.relatedEntityId}`, n]));

  const activeKeys = new Set(dueItems.map((item) => `${item.kind}:${item.id}`));
  const staleIds = existing
    .filter((n) => !activeKeys.has(`${n.relatedEntityType}:${n.relatedEntityId}`))
    .map((n) => n.id);
  if (staleIds.length > 0) {
    // No longer due (paid/completed/skipped/edited past the window) — the
    // reminder is resolved, so it's removed rather than left to go stale.
    await db.delete(notifications).where(inArray(notifications.id, staleIds));
  }

  for (const item of dueItems) {
    const key = `${item.kind}:${item.id}`;
    const current = existingByKey.get(key);
    const dueAt = dueDateToTimestamp(item.dueDate);

    if (!current) {
      await db.insert(notifications).values({
        householdId: household.id,
        title: item.title,
        body: item.meta ?? null,
        category: item.kind,
        relatedEntityType: item.kind,
        relatedEntityId: item.id,
        dueAt,
        read: false,
      });
    } else if (current.title !== item.title || current.dueAt?.getTime() !== dueAt.getTime()) {
      // Content changed (e.g. the due date was edited) — refresh it, but
      // leave `read` alone. Bucket (overdue/due-today/upcoming) is never
      // stored here; it's recomputed fresh from dueAt at read time, same as
      // the dashboard, so a plain day rolling forward doesn't touch this
      // row or reset its read state — only an actual content change does.
      await db
        .update(notifications)
        .set({ title: item.title, body: item.meta ?? null, dueAt })
        .where(eq(notifications.id, current.id));
    }
  }
}
