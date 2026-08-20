import { pgTable, uuid, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";
import { rooms } from "./rooms";
import { schedules } from "./schedules";
import { priorityEnum } from "./enums";

// A chore definition. Individual due/completed occurrences live in
// task_occurrences — this row is the recurring template, not an instance.
export const chores = pgTable("chores", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
  scheduleId: uuid("schedule_id").references(() => schedules.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  priority: priorityEnum("priority").notNull().default("medium"),
  assignee: text("assignee"),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  nextDueDate: date("next_due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
