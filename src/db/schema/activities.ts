import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";
import { activityTypeEnum } from "./enums";

// Same unenforced relatedEntityType/relatedEntityId pointer as notifications,
// and for the same reason — an activity log entry should outlive its source
// row (e.g. a completed chore that's later deleted).
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  type: activityTypeEnum("type").notNull(),
  description: text("description").notNull(),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: uuid("related_entity_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
