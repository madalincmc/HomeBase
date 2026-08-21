import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

let configured = false;

// Lazy rather than module-scope: reading these at import time would throw
// during `next build`, when the env vars legitimately aren't needed yet.
function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type SendResult = { sent: number; pruned: number; failed: number };

// Sends one payload to every subscription for the household. Subscriptions
// die silently all the time (browser reinstalled, permission revoked, iOS
// evicted the web app), and the push service signals that with 404/410 —
// those rows are pruned so they don't accumulate as permanent failures.
export async function sendPushToHousehold(
  householdId: string,
  payload: PushPayload
): Promise<SendResult> {
  if (!configure()) {
    console.error("[push] VAPID env vars missing — cannot send.");
    return { sent: 0, pruned: 0, failed: 0 };
  }

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.householdId, householdId));

  if (subscriptions.length === 0) return { sent: 0, pruned: 0, failed: 0 };

  const body = JSON.stringify(payload);
  const deadIds: string[] = [];
  const liveIds: string[] = [];
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body
        );
        liveIds.push(subscription.id);
      } catch (err) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          deadIds.push(subscription.id);
        } else {
          failed += 1;
          console.error(`[push] send failed (status ${statusCode ?? "unknown"})`, err);
        }
      }
    })
  );

  if (deadIds.length > 0) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, deadIds));
  }
  if (liveIds.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({ lastNotifiedAt: new Date() })
      .where(inArray(pushSubscriptions.id, liveIds));
  }

  return { sent: liveIds.length, pruned: deadIds.length, failed };
}
