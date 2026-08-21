import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

export type Room = typeof rooms.$inferSelect;

// Was duplicated identically in chores/get-chores.ts and
// maintenance/get-maintenance.ts before MAD-97 gave rooms their own module
// — both now import this instead.
export async function getHouseholdRooms(): Promise<Room[]> {
  const household = await getOrCreateHousehold();
  return db.select().from(rooms).where(eq(rooms.householdId, household.id)).orderBy(asc(rooms.name));
}
