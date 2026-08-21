import { pgTable, uuid, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";
import { rooms } from "./rooms";

// A tracked household asset (appliance, electronics, other valuable item) —
// not a recurring template like chores/maintenanceItems, just a record.
// `roomId` ("area/item" from the PRD) is a real FK, ON DELETE SET NULL, same
// pattern chores/maintenanceItems/documents already use for rooms.
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  // Free text, not an enum — same no-fixed-taxonomy precedent as
  // bills.category (MAD-106), maintenanceItems.category (MAD-95), and
  // documents.category (MAD-107).
  category: text("category"),
  brand: text("brand"),
  model: text("model"),
  serialNumber: text("serial_number"),
  purchaseDate: date("purchase_date"),
  price: numeric("price", { precision: 12, scale: 2 }),
  // Both nullable and independent of purchaseDate — a warranty doesn't
  // always start on the purchase date (e.g. registered separately, or an
  // extended warranty added later), so this isn't derived from it. Added in
  // MAD-109.
  warrantyStartDate: date("warranty_start_date"),
  warrantyExpirationDate: date("warranty_expiration_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
