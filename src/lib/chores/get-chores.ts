import { eq, and, inArray, desc } from "drizzle-orm";
import { db } from "@/db";
import { chores, rooms, taskOccurrences, schedules } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

export async function getChores(filters: { roomId?: string } = {}) {
  const household = await getOrCreateHousehold();

  const conditions = [eq(chores.householdId, household.id)];
  if (filters.roomId) conditions.push(eq(chores.roomId, filters.roomId));

  const rows = await db
    .select({ chore: chores, roomName: rooms.name })
    .from(chores)
    .leftJoin(rooms, eq(chores.roomId, rooms.id))
    .where(and(...conditions));

  if (rows.length === 0) {
    return { chores: [], scheduleById: new Map<string, typeof schedules.$inferSelect>() };
  }

  const choreIds = rows.map((r) => r.chore.id);
  const occurrences = await db
    .select()
    .from(taskOccurrences)
    .where(inArray(taskOccurrences.choreId, choreIds))
    .orderBy(desc(taskOccurrences.scheduledFor));

  // occurrences is newest-scheduled-first; take the first pending and first
  // completed row per chore as "current" and "last completed" respectively.
  const pendingByChore = new Map<string, (typeof occurrences)[number]>();
  const lastCompletedByChore = new Map<string, (typeof occurrences)[number]>();
  for (const occ of occurrences) {
    if (!occ.choreId) continue;
    if (occ.status === "pending" && !pendingByChore.has(occ.choreId)) {
      pendingByChore.set(occ.choreId, occ);
    }
    if (occ.status === "completed" && !lastCompletedByChore.has(occ.choreId)) {
      lastCompletedByChore.set(occ.choreId, occ);
    }
  }

  const scheduleIds = rows.map((r) => r.chore.scheduleId).filter((id): id is string => id !== null);
  const scheduleRows =
    scheduleIds.length > 0 ? await db.select().from(schedules).where(inArray(schedules.id, scheduleIds)) : [];
  const scheduleById = new Map(scheduleRows.map((s) => [s.id, s]));

  const sorted = rows
    .map(({ chore, roomName }) => ({
      chore,
      roomName,
      pendingOccurrence: pendingByChore.get(chore.id) ?? null,
      lastCompletedOccurrence: lastCompletedByChore.get(chore.id) ?? null,
    }))
    .sort((a, b) => {
      const aDate = a.pendingOccurrence?.scheduledFor ?? "9999-99-99";
      const bDate = b.pendingOccurrence?.scheduledFor ?? "9999-99-99";
      return aDate.localeCompare(bDate);
    });

  return { chores: sorted, scheduleById };
}
