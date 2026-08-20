import { pgTable, uuid, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";
import { rooms } from "./rooms";
import { schedules } from "./schedules";
import { priorityEnum } from "./enums";

// A maintenance item definition (recurring template) — same relationship to
// task_occurrences as chores.
export const maintenanceItems = pgTable("maintenance_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
  scheduleId: uuid("schedule_id").references(() => schedules.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  relatedAppliance: text("related_appliance"),
  priority: priorityEnum("priority").notNull().default("medium"),
  estimatedCost: numeric("estimated_cost", { precision: 12, scale: 2 }),
  lastCompletedAt: date("last_completed_at"),
  nextDueDate: date("next_due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
