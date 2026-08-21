import { pgTable, uuid, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";
import { schedules } from "./schedules";
import { utilityTypeEnum } from "./enums";

export const utilities = pgTable("utilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  type: utilityTypeEnum("type").notNull(),
  provider: text("provider"),
  accountReference: text("account_reference"),
  unit: text("unit").notNull(),
  scheduleId: uuid("schedule_id").references(() => schedules.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// A utility with multiple physical meters to read each time (the concrete
// case: a water utility with 3 separate taps/points around the house) opts
// into this by having one or more named points. A utility with none behaves
// exactly as before — one reading per visit, no location. Scoped to a
// utility (not the household, unlike `rooms`) since a meter point only ever
// makes sense in the context of the one utility it belongs to.
export const meterPoints = pgTable("meter_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  utilityId: uuid("utility_id")
    .notNull()
    .references(() => utilities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per manual reading. Append-only history — consumption between
// readings is calculated at query time, not stored.
export const meterReadings = pgTable("meter_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  utilityId: uuid("utility_id")
    .notNull()
    .references(() => utilities.id, { onDelete: "cascade" }),
  // Null for every utility that has no meter points (the common case) —
  // set only when this reading belongs to one of the utility's named points.
  // ON DELETE SET NULL, same reasoning as chores/maintenanceItems.roomId:
  // deleting a point unassigns its history rather than destroying it.
  meterPointId: uuid("meter_point_id").references(() => meterPoints.id, { onDelete: "set null" }),
  value: numeric("value", { precision: 12, scale: 3 }).notNull(),
  readingDate: date("reading_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
