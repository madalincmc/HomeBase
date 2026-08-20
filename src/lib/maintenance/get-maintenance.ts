import { eq, inArray, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { maintenanceItems, rooms, taskOccurrences, schedules, attachments } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

export async function getMaintenanceItems() {
  const household = await getOrCreateHousehold();

  const rows = await db
    .select({ item: maintenanceItems, roomName: rooms.name })
    .from(maintenanceItems)
    .leftJoin(rooms, eq(maintenanceItems.roomId, rooms.id))
    .where(eq(maintenanceItems.householdId, household.id));

  if (rows.length === 0) {
    return {
      items: [],
      scheduleById: new Map<string, typeof schedules.$inferSelect>(),
      attachmentsByItem: new Map<string, (typeof attachments.$inferSelect)[]>(),
    };
  }

  const itemIds = rows.map((r) => r.item.id);
  const occurrences = await db
    .select()
    .from(taskOccurrences)
    .where(inArray(taskOccurrences.maintenanceItemId, itemIds))
    .orderBy(desc(taskOccurrences.scheduledFor));

  const pendingByItem = new Map<string, (typeof occurrences)[number]>();
  for (const occ of occurrences) {
    if (!occ.maintenanceItemId) continue;
    if (occ.status === "pending" && !pendingByItem.has(occ.maintenanceItemId)) {
      pendingByItem.set(occ.maintenanceItemId, occ);
    }
  }

  const scheduleIds = rows.map((r) => r.item.scheduleId).filter((id): id is string => id !== null);
  const scheduleRows =
    scheduleIds.length > 0 ? await db.select().from(schedules).where(inArray(schedules.id, scheduleIds)) : [];
  const scheduleById = new Map(scheduleRows.map((s) => [s.id, s]));

  const attachmentRows = await db.select().from(attachments).where(inArray(attachments.maintenanceItemId, itemIds));
  const attachmentsByItem = new Map<string, typeof attachmentRows>();
  for (const attachment of attachmentRows) {
    if (!attachment.maintenanceItemId) continue;
    const list = attachmentsByItem.get(attachment.maintenanceItemId) ?? [];
    list.push(attachment);
    attachmentsByItem.set(attachment.maintenanceItemId, list);
  }

  const sorted = rows
    .map(({ item, roomName }) => ({
      item,
      roomName,
      pendingOccurrence: pendingByItem.get(item.id) ?? null,
    }))
    .sort((a, b) => {
      const aDate = a.pendingOccurrence?.scheduledFor ?? "9999-99-99";
      const bDate = b.pendingOccurrence?.scheduledFor ?? "9999-99-99";
      return aDate.localeCompare(bDate);
    });

  return { items: sorted, scheduleById, attachmentsByItem };
}

export async function getHouseholdRooms() {
  const household = await getOrCreateHousehold();
  return db.select().from(rooms).where(eq(rooms.householdId, household.id)).orderBy(asc(rooms.name));
}
