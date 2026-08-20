import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { utilities, meterReadings } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { computeConsumption } from "./consumption";

export async function getUtilitiesWithLatestReadings() {
  const household = await getOrCreateHousehold();
  const householdUtilities = await db
    .select()
    .from(utilities)
    .where(eq(utilities.householdId, household.id));

  if (householdUtilities.length === 0) return [];

  const utilityIds = householdUtilities.map((u) => u.id);
  const recentReadings = await db
    .select()
    .from(meterReadings)
    .where(inArray(meterReadings.utilityId, utilityIds))
    .orderBy(desc(meterReadings.readingDate), desc(meterReadings.createdAt));

  // Global list is sorted newest-first; keep at most the 2 most recent per
  // utility as we walk it — no per-utility query needed at this scale.
  const readingsByUtility = new Map<string, typeof recentReadings>();
  for (const reading of recentReadings) {
    const existing = readingsByUtility.get(reading.utilityId) ?? [];
    if (existing.length < 2) {
      existing.push(reading);
      readingsByUtility.set(reading.utilityId, existing);
    }
  }

  return householdUtilities.map((utility) => {
    const [latest, previous] = readingsByUtility.get(utility.id) ?? [];
    return {
      ...utility,
      latestReading: latest ?? null,
      consumption: latest && previous ? computeConsumption(previous.value, latest.value) : null,
    };
  });
}
