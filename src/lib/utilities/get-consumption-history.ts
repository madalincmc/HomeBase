import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { meterReadings } from "@/db/schema";
import { annotateReadingsWithConsumption } from "./consumption";

export type ConsumptionEntry = {
  id: string;
  date: string;
  value: number;
  consumption: number | null;
  // True when the previous reading of the same meter point was more than 45
  // days earlier (see annotateReadingsWithConsumption) — this reading's
  // consumption (if any) spans an incomplete period.
  gap: boolean;
};

export type MonthlyConsumption = {
  month: string; // YYYY-MM
  totalConsumption: number | null; // null only when nothing in the month was computable at all
  hasGap: boolean;
};

export async function getConsumptionHistory(utilityId: string): Promise<{
  history: ConsumptionEntry[];
  monthly: MonthlyConsumption[];
}> {
  const readings = await db
    .select()
    .from(meterReadings)
    .where(eq(meterReadings.utilityId, utilityId))
    .orderBy(asc(meterReadings.readingDate), asc(meterReadings.createdAt));

  // Grouped by meter point internally, so a water utility's 3 points each
  // get their own delta chain instead of being compared against each other
  // — the monthly bucketing below sums across points unchanged either way.
  const annotated = annotateReadingsWithConsumption(readings);
  const history: ConsumptionEntry[] = annotated.map((reading) => ({
    id: reading.id,
    date: reading.readingDate,
    value: Number(reading.value),
    consumption: reading.consumption,
    gap: reading.gap,
  }));

  // Bucketed by the month of the *later* reading in each pair — "how much
  // was used, as recorded during month X" — summing multiple deltas that
  // happen to land in the same month rather than assuming one reading per
  // month.
  const buckets = new Map<string, { total: number; hasValue: boolean; hasGap: boolean }>();
  for (const entry of history) {
    if (entry.consumption === null && !entry.gap) continue; // the very first reading ever — nothing to attribute yet
    const month = entry.date.slice(0, 7);
    const bucket = buckets.get(month) ?? { total: 0, hasValue: false, hasGap: false };
    if (entry.gap) bucket.hasGap = true;
    if (entry.consumption !== null) {
      bucket.total += entry.consumption;
      bucket.hasValue = true;
    }
    buckets.set(month, bucket);
  }

  const monthly: MonthlyConsumption[] = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, bucket]) => ({
      month,
      totalConsumption: bucket.hasValue ? Number(bucket.total.toFixed(3)) : null,
      hasGap: bucket.hasGap,
    }));

  return { history, monthly };
}
