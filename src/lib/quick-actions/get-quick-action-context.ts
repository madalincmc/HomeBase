"use server";

import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { rooms, utilities } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

export type QuickActionUtility = { id: string; type: string; unit: string; provider: string | null };
export type QuickActionRoom = { id: string; name: string };

export type QuickActionContext = {
  utilities: QuickActionUtility[];
  rooms: QuickActionRoom[];
};

// Fetched lazily via a Server Action when the quick-action menu opens,
// rather than as server-rendered props — same reasoning as MAD-98's
// notification bell: this button lives in AppShell, which the root layout
// wraps around every route, so a direct DB read there would force the
// entire app dynamic instead of just the pages that already opt into it.
export async function getQuickActionContext(): Promise<QuickActionContext> {
  const household = await getOrCreateHousehold();

  const [utilityRows, roomRows] = await Promise.all([
    db
      .select({ id: utilities.id, type: utilities.type, unit: utilities.unit, provider: utilities.provider })
      .from(utilities)
      .where(eq(utilities.householdId, household.id))
      .orderBy(asc(utilities.type)),
    db
      .select({ id: rooms.id, name: rooms.name })
      .from(rooms)
      .where(eq(rooms.householdId, household.id))
      .orderBy(asc(rooms.name)),
  ]);

  return { utilities: utilityRows, rooms: roomRows };
}
