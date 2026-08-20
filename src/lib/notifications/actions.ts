"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { syncNotifications } from "./sync-notifications";
import { getNotifications, type NotificationListItem } from "./get-notifications";

export type ActionResult = { success: true } | { success: false; error: string };

// Called from the notification bell on mount/open rather than from a page
// render — there's no cron to generate these on a schedule, so the sync
// step runs inline right before reading. A Server Action (not a page data
// loader) so it always executes fresh, regardless of any route's own
// static/dynamic rendering mode.
export async function getNotificationCenterData(): Promise<{
  notifications: NotificationListItem[];
  unreadCount: number;
}> {
  await syncNotifications();
  return getNotifications();
}

export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.householdId, household.id)));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.householdId, household.id), eq(notifications.read, false)));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
