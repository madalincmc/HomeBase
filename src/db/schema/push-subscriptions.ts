import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { households } from "./households";

// One row per browser/device that has granted notification permission and
// subscribed. The endpoint is issued by the browser's push service (Apple
// for iOS/Safari, Google for Chrome) and is what we POST to in order to
// deliver a message — the p256dh/auth keys encrypt the payload so the push
// service itself can't read it.
//
// `endpoint` is unique: re-subscribing the same browser returns the same
// endpoint, so this doubles as the upsert key and stops duplicate rows
// producing duplicate notifications on one device.
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    // Purely diagnostic — lets us see whether a subscription has ever
    // actually received anything, without needing the push service's logs.
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("push_subscriptions_endpoint_unique").on(table.endpoint)]
);
