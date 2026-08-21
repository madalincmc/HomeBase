import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";
import { rooms } from "./rooms";

// A standalone household document (receipt, warranty, manual, contract,
// service record) — distinct from `attachments`, which is always a photo
// taken *during* one specific action (a meter reading, a bill, a completed
// maintenance item) and requires exactly one parent. A vault document has no
// required parent at all: it can stand alone, or optionally link to one.
//
// `roomId` ("area") is a real FK, same ON DELETE SET NULL pattern chores/
// maintenanceItems already use — rooms are a known, fixed entity type.
// `relatedEntityType`/`relatedEntityId` ("item") is deliberately the
// *unenforced* pointer pattern from notifications/activities instead of a
// real FK, because the linkable set isn't fixed: it's bills and maintenance
// items today, and MAD-107's own acceptance criteria calls out "future
// inventory records" — a type this schema can't reference yet. Adding that
// type later needs zero migration here, same reasoning CLAUDE.md already
// documents for notifications/activities.
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  // Free text, not an enum — same reasoning as bills.category (MAD-106) and
  // maintenanceItems.category (MAD-95): no fixed document-category list
  // exists in the PRD (e.g. "Warranty", "Manual", "Receipt").
  category: text("category"),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: uuid("related_entity_id"),
  notes: text("notes"),
  url: text("url").notNull(),
  filename: text("filename"),
  contentType: text("content_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
