import { pgTable, uuid, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";
import { priorityEnum, repairStatusEnum } from "./enums";

// A one-off household problem, not a recurring template — no schedule/
// occurrence machinery, same reasoning as inventoryItems (MAD-108). No room
// association either: unlike chores/maintenanceItems/documents/inventory,
// the PRD's acceptance criteria for this feature never mentions an area/room
// field, so this doesn't add one speculatively.
export const repairs = pgTable("repairs", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  priority: priorityEnum("priority").notNull().default("medium"),
  status: repairStatusEnum("status").notNull().default("open"),
  reportedDate: date("reported_date").notNull(),
  repairedDate: date("repaired_date"),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  contractor: text("contractor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
