"use server";

import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { rooms, utilities, meterPoints } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

export type QuickActionMeterPoint = { id: string; name: string };
export type QuickActionUtility = {
  id: string;
  type: string;
  unit: string;
  provider: string | null;
  meterPoints: QuickActionMeterPoint[];
};
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

  // Water's multi-point case (see CLAUDE.md) needs to reach the FAB's quick
  // "Add reading" flow too, not just the full utility detail page — mobile
  // is the primary way this household actually enters readings.
  const utilityIds = utilityRows.map((u) => u.id);
  const pointRows =
    utilityIds.length > 0
      ? await db
          .select({ id: meterPoints.id, utilityId: meterPoints.utilityId, name: meterPoints.name })
          .from(meterPoints)
          .where(inArray(meterPoints.utilityId, utilityIds))
          .orderBy(asc(meterPoints.name))
      : [];
  const pointsByUtility = new Map<string, QuickActionMeterPoint[]>();
  for (const point of pointRows) {
    const list = pointsByUtility.get(point.utilityId) ?? [];
    list.push({ id: point.id, name: point.name });
    pointsByUtility.set(point.utilityId, list);
  }

  return {
    utilities: utilityRows.map((utility) => ({ ...utility, meterPoints: pointsByUtility.get(utility.id) ?? [] })),
    rooms: roomRows,
  };
}
