import { pgTable, uuid, text, numeric, date, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { chores } from "./chores";
import { maintenanceItems } from "./maintenance";
import { occurrenceStatusEnum } from "./enums";

// One row per due/completed/skipped occurrence of a chore or maintenance
// item — this is what preserves completion history for those two entities
// (bills and meter readings preserve history just by being append-only rows
// in their own tables, so they don't need an occurrences table).
//
// Exactly one of choreId/maintenanceItemId is set: a real FK (with cascade
// delete) rather than a polymorphic type+id column, so occurrence rows can't
// dangle and the DB enforces "belongs to exactly one parent" itself.
export const taskOccurrences = pgTable(
  "task_occurrences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    choreId: uuid("chore_id").references(() => chores.id, { onDelete: "cascade" }),
    maintenanceItemId: uuid("maintenance_item_id").references(() => maintenanceItems.id, {
      onDelete: "cascade",
    }),
    scheduledFor: date("scheduled_for").notNull(),
    status: occurrenceStatusEnum("status").notNull().default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    cost: numeric("cost", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "task_occurrences_exactly_one_parent",
      sql`(${table.choreId} is not null) <> (${table.maintenanceItemId} is not null)`
    ),
  ]
);
