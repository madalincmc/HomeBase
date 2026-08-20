import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";
import { notificationCategoryEnum } from "./enums";

// relatedEntityType/relatedEntityId are a deliberately unenforced (no FK)
// pointer at whichever entity triggered the notification — a real FK per
// entity type would mean 4+ nullable columns for a log table, and a
// notification arguably shouldn't vanish just because its source did.
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  category: notificationCategoryEnum("category").notNull(),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: uuid("related_entity_id"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
