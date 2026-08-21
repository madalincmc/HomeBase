import { eq, and, or, ilike, isNotNull, inArray, asc } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, rooms, attachments } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

export async function getInventoryItems(filters: { q?: string; category?: string; roomId?: string } = {}) {
  const household = await getOrCreateHousehold();
  const conditions = [eq(inventoryItems.householdId, household.id)];
  if (filters.category) conditions.push(eq(inventoryItems.category, filters.category));
  if (filters.roomId) conditions.push(eq(inventoryItems.roomId, filters.roomId));
  // "Inventory can be searched and filtered" — matches name, category,
  // brand, model, or serial number.
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(inventoryItems.name, pattern),
        ilike(inventoryItems.category, pattern),
        ilike(inventoryItems.brand, pattern),
        ilike(inventoryItems.model, pattern),
        ilike(inventoryItems.serialNumber, pattern)
      )!
    );
  }

  const rows = await db
    .select({ item: inventoryItems, roomName: rooms.name })
    .from(inventoryItems)
    .leftJoin(rooms, eq(inventoryItems.roomId, rooms.id))
    .where(and(...conditions))
    .orderBy(asc(inventoryItems.name));

  if (rows.length === 0) {
    return { items: rows, attachmentsByItem: new Map<string, (typeof attachments.$inferSelect)[]>() };
  }

  const itemIds = rows.map((r) => r.item.id);
  const attachmentRows = await db
    .select()
    .from(attachments)
    .where(inArray(attachments.inventoryItemId, itemIds));
  const attachmentsByItem = new Map<string, (typeof attachments.$inferSelect)[]>();
  for (const attachment of attachmentRows) {
    if (!attachment.inventoryItemId) continue;
    const list = attachmentsByItem.get(attachment.inventoryItemId) ?? [];
    list.push(attachment);
    attachmentsByItem.set(attachment.inventoryItemId, list);
  }

  return { items: rows, attachmentsByItem };
}

export async function getInventoryCategories(): Promise<string[]> {
  const household = await getOrCreateHousehold();
  const rows = await db
    .selectDistinct({ category: inventoryItems.category })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.householdId, household.id), isNotNull(inventoryItems.category)));
  return rows.map((r) => r.category!).sort();
}

export async function getInventoryItemOptions(): Promise<{ id: string; name: string }[]> {
  const household = await getOrCreateHousehold();
  return db
    .select({ id: inventoryItems.id, name: inventoryItems.name })
    .from(inventoryItems)
    .where(eq(inventoryItems.householdId, household.id))
    .orderBy(asc(inventoryItems.name));
}
