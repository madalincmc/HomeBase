import { pgTable, uuid, text, integer, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { households } from "./households";
import { meterReadings } from "./utilities";
import { bills } from "./bills";
import { maintenanceItems } from "./maintenance";
import { inventoryItems } from "./inventory-items";
import { repairs } from "./repairs";

// `url` is populated once Vercel Blob upload lands (MAD-96) — this table
// only defines where a file record can attach to. Exactly one parent FK is
// set, enforced the same way as task_occurrences (see that file's comment).
// inventoryItemId was added in MAD-108 — inventory items attach photos/
// receipts/manuals at create or edit time (like bills), not at a
// "completion" event (there isn't one for a static asset record).
// repairId was added in MAD-110, same create/edit-time attachment timing.
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    meterReadingId: uuid("meter_reading_id").references(() => meterReadings.id, {
      onDelete: "cascade",
    }),
    billId: uuid("bill_id").references(() => bills.id, { onDelete: "cascade" }),
    maintenanceItemId: uuid("maintenance_item_id").references(() => maintenanceItems.id, {
      onDelete: "cascade",
    }),
    inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id, {
      onDelete: "cascade",
    }),
    repairId: uuid("repair_id").references(() => repairs.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    filename: text("filename"),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "attachments_exactly_one_parent",
      sql`(
        (case when ${table.meterReadingId} is not null then 1 else 0 end) +
        (case when ${table.billId} is not null then 1 else 0 end) +
        (case when ${table.maintenanceItemId} is not null then 1 else 0 end) +
        (case when ${table.inventoryItemId} is not null then 1 else 0 end) +
        (case when ${table.repairId} is not null then 1 else 0 end)
      ) = 1`
    ),
  ]
);
