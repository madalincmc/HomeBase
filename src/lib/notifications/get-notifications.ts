import type { Route } from "next";
import { eq, and, asc, count } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { todayDateOnly, type DateOnly } from "@/lib/schedule";
import type { DueBucket } from "@/lib/dashboard/get-due-items";

const NOTIFICATION_LIMIT = 30;

export type NotificationListItem = {
  id: string;
  title: string;
  body: string | null;
  category: string;
  dueDate: DateOnly | null;
  bucket: DueBucket | null;
  href: Route | null;
  read: boolean;
  createdAt: Date;
};

// Same href-per-category mapping getDueItems() uses to build these rows in
// the first place — recomputed here rather than stored, so a stale stored
// href can never point somewhere wrong.
function hrefFor(category: string, relatedEntityId: string | null): Route | null {
  if (!relatedEntityId) return null;
  switch (category) {
    case "bill":
      return "/bills";
    case "chore":
      return "/tasks";
    case "maintenance":
      return "/maintenance";
    case "utility":
      return `/utilities/${relatedEntityId}` as Route;
    default:
      return null;
  }
}

function bucketFor(dueDate: DateOnly | null, today: DateOnly): DueBucket | null {
  if (!dueDate) return null;
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "dueToday";
  return "upcoming";
}

export async function getNotifications(): Promise<{
  notifications: NotificationListItem[];
  unreadCount: number;
}> {
  const household = await getOrCreateHousehold();
  const today = todayDateOnly();

  const [rows, [{ value: unreadCount }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.householdId, household.id))
      .orderBy(asc(notifications.read), asc(notifications.dueAt))
      .limit(NOTIFICATION_LIMIT),
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.householdId, household.id), eq(notifications.read, false))),
  ]);

  return {
    notifications: rows.map((row) => {
      const dueDate = row.dueAt ? (row.dueAt.toISOString().slice(0, 10) as DateOnly) : null;
      return {
        id: row.id,
        title: row.title,
        body: row.body,
        category: row.category,
        dueDate,
        bucket: bucketFor(dueDate, today),
        href: hrefFor(row.category, row.relatedEntityId),
        read: row.read,
        createdAt: row.createdAt,
      };
    }),
    unreadCount,
  };
}
