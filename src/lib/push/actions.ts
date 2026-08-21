"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

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

// Lets the bell show whether *this* browser is already subscribed, rather
// than only whether permission was granted — the two can diverge (permission
// granted but the row pruned after a 410, for example).
export async function isEndpointSubscribed(endpoint: string): Promise<boolean> {
  const [row] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
  return Boolean(row);
}
