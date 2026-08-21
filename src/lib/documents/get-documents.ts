import { eq, and, or, ilike, isNotNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import { documents, rooms, bills, maintenanceItems, inventoryItems } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

export type DocumentRow = typeof documents.$inferSelect & {
  roomName: string | null;
  linkedTitle: string | null;
};

export async function getDocuments(filters: { q?: string; category?: string; roomId?: string } = {}): Promise<
  DocumentRow[]
> {
  const household = await getOrCreateHousehold();
  const conditions = [eq(documents.householdId, household.id)];
  if (filters.category) conditions.push(eq(documents.category, filters.category));
  if (filters.roomId) conditions.push(eq(documents.roomId, filters.roomId));
  // Search matches title, category, notes, or the original filename —
  // "search by title and metadata" from the acceptance criteria.
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(documents.title, pattern),
        ilike(documents.category, pattern),
        ilike(documents.notes, pattern),
        ilike(documents.filename, pattern)
      )!
    );
  }

  const rows = await db
    .select({ document: documents, roomName: rooms.name })
    .from(documents)
    .leftJoin(rooms, eq(documents.roomId, rooms.id))
    .where(and(...conditions))
    .orderBy(documents.createdAt);

  // relatedEntityType/Id is deliberately unenforced (no FK, see the schema
  // comment) — so the linked title has to be resolved with a second pass
  // rather than a join. A stale link (the bill/item was since deleted)
  // just resolves to no title, same as notifications/activities already do.
  const billIds = rows
    .filter((r) => r.document.relatedEntityType === "bill" && r.document.relatedEntityId)
    .map((r) => r.document.relatedEntityId!);
  const maintenanceIds = rows
    .filter((r) => r.document.relatedEntityType === "maintenance_item" && r.document.relatedEntityId)
    .map((r) => r.document.relatedEntityId!);
  const inventoryIds = rows
    .filter((r) => r.document.relatedEntityType === "inventory_item" && r.document.relatedEntityId)
    .map((r) => r.document.relatedEntityId!);

  const billTitles = new Map<string, string>();
  if (billIds.length > 0) {
    const billRows = await db.select({ id: bills.id, title: bills.title }).from(bills).where(inArray(bills.id, billIds));
    for (const b of billRows) billTitles.set(b.id, b.title);
  }
  const maintenanceTitles = new Map<string, string>();
  if (maintenanceIds.length > 0) {
    const itemRows = await db
      .select({ id: maintenanceItems.id, title: maintenanceItems.title })
      .from(maintenanceItems)
      .where(inArray(maintenanceItems.id, maintenanceIds));
    for (const i of itemRows) maintenanceTitles.set(i.id, i.title);
  }
  const inventoryTitles = new Map<string, string>();
  if (inventoryIds.length > 0) {
    const itemRows = await db
      .select({ id: inventoryItems.id, name: inventoryItems.name })
      .from(inventoryItems)
      .where(inArray(inventoryItems.id, inventoryIds));
    for (const i of itemRows) inventoryTitles.set(i.id, i.name);
  }

  return rows.map((r) => ({
    ...r.document,
    roomName: r.roomName,
    linkedTitle:
      r.document.relatedEntityType === "bill"
        ? (billTitles.get(r.document.relatedEntityId ?? "") ?? null)
        : r.document.relatedEntityType === "maintenance_item"
          ? (maintenanceTitles.get(r.document.relatedEntityId ?? "") ?? null)
          : r.document.relatedEntityType === "inventory_item"
            ? (inventoryTitles.get(r.document.relatedEntityId ?? "") ?? null)
            : null,
  }));
}

export async function getDocumentCategories(): Promise<string[]> {
  const household = await getOrCreateHousehold();
  const rows = await db
    .selectDistinct({ category: documents.category })
    .from(documents)
    .where(and(eq(documents.householdId, household.id), isNotNull(documents.category)));
  return rows.map((r) => r.category!).sort();
}

export type LinkableEntities = {
  bills: { id: string; title: string }[];
  maintenanceItems: { id: string; title: string }[];
  inventoryItems: { id: string; title: string }[];
};

export async function getLinkableEntities(): Promise<LinkableEntities> {
  const household = await getOrCreateHousehold();
  const [billRows, itemRows, inventoryRows] = await Promise.all([
    db.select({ id: bills.id, title: bills.title }).from(bills).where(eq(bills.householdId, household.id)),
    db
      .select({ id: maintenanceItems.id, title: maintenanceItems.title })
      .from(maintenanceItems)
      .where(eq(maintenanceItems.householdId, household.id)),
    db
      .select({ id: inventoryItems.id, title: inventoryItems.name })
      .from(inventoryItems)
      .where(eq(inventoryItems.householdId, household.id)),
  ]);
  return { bills: billRows, maintenanceItems: itemRows, inventoryItems: inventoryRows };
}
