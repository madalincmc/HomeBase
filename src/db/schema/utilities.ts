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

// One row per manual reading. Append-only history — consumption between
// readings is calculated at query time, not stored.
export const meterReadings = pgTable("meter_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  utilityId: uuid("utility_id")
    .notNull()
    .references(() => utilities.id, { onDelete: "cascade" }),
  value: numeric("value", { precision: 12, scale: 3 }).notNull(),
  readingDate: date("reading_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
