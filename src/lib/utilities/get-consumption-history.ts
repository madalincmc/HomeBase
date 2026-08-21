import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { meterReadings } from "@/db/schema";
import { computeConsumption } from "./consumption";
import type { DateOnly } from "@/lib/schedule";

// A gap this long between two consecutive readings means at least one
// reading was very likely missed — flagged regardless of the utility's own
// reading-reminder frequency (even a monthly-scheduled utility with a
// 45+ day gap between actual readings has a real gap), rather than trying
// to compute an "expected" gap per schedule frequency.
const GAP_THRESHOLD_DAYS = 45;

export type ConsumptionEntry = {
  id: string;
  date: DateOnly;
  value: number;
  consumption: number | null;
  // True when the previous reading was more than GAP_THRESHOLD_DAYS earlier
  // — this reading's consumption (if any) spans an incomplete period.
  gap: boolean;
};

export type MonthlyConsumption = {
  month: string; // YYYY-MM
  totalConsumption: number | null; // null only when nothing in the month was computable at all
  hasGap: boolean;
};

function daysBetween(a: DateOnly, b: DateOnly): number {
  const aTime = new Date(`${a}T00:00:00Z`).getTime();
  const bTime = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((bTime - aTime) / 86_400_000);
}

export async function getConsumptionHistory(utilityId: string): Promise<{
  history: ConsumptionEntry[];
  monthly: MonthlyConsumption[];
}> {
  const readings = await db
    .select()
    .from(meterReadings)
    .where(eq(meterReadings.utilityId, utilityId))
    .orderBy(asc(meterReadings.readingDate), asc(meterReadings.createdAt));

  const history: ConsumptionEntry[] = readings.map((reading, index) => {
    const previous = readings[index - 1];
    const gap = previous ? daysBetween(previous.readingDate, reading.readingDate) > GAP_THRESHOLD_DAYS : false;
    return {
      id: reading.id,
      date: reading.readingDate,
      value: Number(reading.value),
      consumption: previous ? computeConsumption(previous.value, reading.value) : null,
      gap,
    };
  });

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
