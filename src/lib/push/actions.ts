"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { sendPushToHousehold } from "./send";

export type PushActionResult = { success: true } | { success: false; error: string };

export type SerializedSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(
  subscription: SerializedSubscription
): Promise<PushActionResult> {
  try {
    const household = await getOrCreateHousehold();

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      throw new Error("Incomplete push subscription.");
    }

    // Upsert on endpoint: the browser hands back the same endpoint when a
    // device re-subscribes, so this refreshes the keys in place instead of
    // creating a duplicate row that would double-notify that device.
    await db
      .insert(pushSubscriptions)
      .values({
        householdId: household.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          householdId: household.id,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Could not save subscription." };
  }
}

export async function deletePushSubscription(endpoint: string): Promise<PushActionResult> {
  try {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Could not remove subscription." };
  }
}

export type SubscriptionStatus = {
  /** Whether the server actually holds a row for this browser's endpoint. */
  registered: boolean;
  /** Null until a push has genuinely been delivered to this device. */
  lastNotifiedAt: Date | null;
};

// The browser having a PushSubscription object and the server having a row
// for it are two independent facts, and they diverge in practice: the row is
// pruned on a 404/410, or a save failed, or the database was reset. Trusting
// only the browser side is what let the bell report "reminders are on" for a
// device the server had never heard of — reminders that could never arrive,
// with no way to notice from inside the app. Always confirm against this.
export async function getSubscriptionStatus(endpoint: string): Promise<SubscriptionStatus> {
  const [row] = await db
    .select({ id: pushSubscriptions.id, lastNotifiedAt: pushSubscriptions.lastNotifiedAt })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  return { registered: Boolean(row), lastNotifiedAt: row?.lastNotifiedAt ?? null };
}

export type TestPushResult =
  | { success: true; sent: number; pruned: number }
  | { success: false; error: string };

// Sends a real push through the exact same path the cron slots use, on
// demand. Without this the only way to find out whether delivery works is to
// wait for the next scheduled slot — a feedback loop measured in hours, and
// the reason a device being unregistered went unnoticed for a full day.
export async function sendTestPush(): Promise<TestPushResult> {
  try {
    const household = await getOrCreateHousehold();
    const result = await sendPushToHousehold(household.id, {
      title: "HomeBase test",
      body: "Reminders are working. This is the only notification you asked for.",
      url: "/",
      // Deliberately not the "homebase-reminder" tag the slots use — a test
      // shouldn't replace, or be replaced by, a genuine outstanding reminder.
      tag: "homebase-test",
    });

    if (result.unconfigured) {
      return { success: false, error: "Push isn't configured on the server." };
    }
    if (result.total === 0) {
      return { success: false, error: "No devices are registered for reminders yet." };
    }
    // Every device was dead: the row(s) have just been pruned, so the honest
    // answer is that this device needs re-enabling, not that sending failed.
    if (result.sent === 0 && result.pruned > 0) {
      return { success: false, error: "This device's subscription expired. Turn reminders off and on again." };
    }
    if (result.sent === 0) {
      return { success: false, error: "The push service rejected the message. Try again shortly." };
    }

    return { success: true, sent: result.sent, pruned: result.pruned };
  } catch (err) {
    console.error("[push] test send failed", err);
    return { success: false, error: "Could not send a test notification." };
  }
}
