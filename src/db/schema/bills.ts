import { pgTable, uuid, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";
import { utilities } from "./utilities";
import { schedules } from "./schedules";
import { billStatusEnum } from "./enums";

// Each billing period is its own row — recurring bills share a scheduleId
// rather than pointing at a "series" record, which is what preserves
// payment history: nothing gets overwritten, a new bill is created instead.
export const bills = pgTable("bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  utilityId: uuid("utility_id").references(() => utilities.id, { onDelete: "set null" }),
  scheduleId: uuid("schedule_id").references(() => schedules.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  provider: text("provider"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  issueDate: date("issue_date"),
  dueDate: date("due_date").notNull(),
  status: billStatusEnum("status").notNull().default("upcoming"),
  paidDate: date("paid_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
