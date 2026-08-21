import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { utilities, meterReadings } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { annotateReadingsWithConsumption } from "./consumption";

// Minimal shape for the utility switcher (MAD-105) — deliberately not
// reusing getUtilitiesWithLatestReadings() here, since that also fetches
// and aggregates readings the switcher never displays.
export async function getUtilitiesSummary() {
  const household = await getOrCreateHousehold();
  return db
    .select({ id: utilities.id, type: utilities.type, provider: utilities.provider })
    .from(utilities)
    .where(eq(utilities.householdId, household.id))
    .orderBy(asc(utilities.type));
}

export async function getUtilitiesWithLatestReadings() {
  const household = await getOrCreateHousehold();
  const householdUtilities = await db
    .select()
    .from(utilities)
    .where(eq(utilities.householdId, household.id));

  if (householdUtilities.length === 0) return [];

  const utilityIds = householdUtilities.map((u) => u.id);
  // Fetches every reading, not just the 2 most recent — a water utility
  // with meter points can have several readings sharing the latest date
  // (one per point), and annotateReadingsWithConsumption needs each point's
  // own history to compute its delta correctly, not just its single latest
  // row. Still a tiny dataset for a personal household, same reasoning
  // already applied elsewhere (e.g. cost analytics) to skip pagination.
  const allReadings = await db
    .select()
    .from(meterReadings)
    .where(inArray(meterReadings.utilityId, utilityIds))
    .orderBy(asc(meterReadings.readingDate), asc(meterReadings.createdAt));

  const readingsByUtility = new Map<string, typeof allReadings>();
  for (const reading of allReadings) {
    const list = readingsByUtility.get(reading.utilityId) ?? [];
    list.push(reading);
    readingsByUtility.set(reading.utilityId, list);
  }

  return householdUtilities.map((utility) => {
    const readings = readingsByUtility.get(utility.id) ?? [];
    if (readings.length === 0) {
      return { ...utility, latestReading: null, consumption: null };
    }

    // Grouped by meter point internally — a no-op for a single-meter
    // utility (every reading shares the same null point), but for water
    // with 3 points this keeps each point's delta chain separate.
    const annotated = annotateReadingsWithConsumption(readings);
    const latestDate = annotated[annotated.length - 1].readingDate;
    const atLatestDate = annotated.filter((reading) => reading.readingDate === latestDate);
    const totalValue = atLatestDate.reduce((sum, reading) => sum + Number(reading.value), 0);
    const consumptions = atLatestDate
      .map((reading) => reading.consumption)
      .filter((c): c is number => c !== null);

    return {
      ...utility,
      // Summed across whichever readings share the latest date — for a
      // single-meter utility that's just its one latest reading, unchanged
      // from before; for water with points, it's the combined total.
      latestReading: { value: totalValue, readingDate: latestDate },
      consumption: consumptions.length > 0 ? Number(consumptions.reduce((a, b) => a + b, 0).toFixed(3)) : null,
    };
  });
}
