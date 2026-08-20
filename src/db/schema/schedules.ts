import { pgTable, uuid, integer, date, text, timestamp } from "drizzle-orm/pg-core";
import { scheduleFrequencyEnum } from "./enums";

// Shared recurrence rule, reused by utilities (reading reminders), bills,
// chores, and maintenance items. The actual "what's due next" computation is
// MAD-90's job — this table only stores the rule.
export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  frequency: scheduleFrequencyEnum("frequency").notNull(),
  interval: integer("interval").notNull().default(1),
  anchorDate: date("anchor_date").notNull(),
  customRule: text("custom_rule"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
