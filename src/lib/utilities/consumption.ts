import type { DateOnly } from "@/lib/schedule";

// Meter readings are cumulative — consumption between two readings is just
// the delta. Returns null when it can't be computed (no prior reading) or
// when the delta is negative (meter reset/rollover) — MVP doesn't attempt
// to detect or correct for a rollover, it just omits a nonsensical number.
export function computeConsumption(previousValue: string, currentValue: string): number | null {
  const prev = Number(previousValue);
  const curr = Number(currentValue);
  if (!Number.isFinite(prev) || !Number.isFinite(curr)) return null;
  const delta = Number((curr - prev).toFixed(3));
  return delta >= 0 ? delta : null;
}

// A gap this long between two consecutive readings of the *same* meter means
// one was very likely missed — flagged regardless of the utility's own
// reading-reminder frequency, rather than trying to compute an "expected"
// gap per schedule frequency. Shared by every consumption consumer (chart,
// detail-page history, list-page summary) so the threshold can't drift
// between them.
const GAP_THRESHOLD_DAYS = 45;

function daysBetween(a: DateOnly, b: DateOnly): number {
  const aTime = new Date(`${a}T00:00:00Z`).getTime();
  const bTime = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((bTime - aTime) / 86_400_000);
}

export type ReadingForConsumption = {
  id: string;
  meterPointId: string | null;
  value: string;
  readingDate: DateOnly;
};

export type AnnotatedReading<T> = T & { consumption: number | null; gap: boolean };

// A water utility can have multiple named meter points (MAD-1xx) — each is a
// physically separate meter, so consumption must be the delta between two
// readings of the *same* point, never between two different points that
// merely happen to be read around the same time. Readings with no point at
// all (every reading for a utility that hasn't set any up, which is most
// utilities) form their own group the same way, keyed by `null`, so nothing
// changes for a single-meter utility. Input must already be sorted ascending
// by date (then insertion order) — grouping preserves that per-group order
// without re-sorting, and the returned array stays in the same overall order
// as the input.
export function annotateReadingsWithConsumption<T extends ReadingForConsumption>(
  readingsAscending: T[]
): AnnotatedReading<T>[] {
  const groups = new Map<string, T[]>();
  for (const reading of readingsAscending) {
    const key = reading.meterPointId ?? "";
    const group = groups.get(key) ?? [];
    group.push(reading);
    groups.set(key, group);
  }

  const annotatedById = new Map<string, { consumption: number | null; gap: boolean }>();
  for (const group of groups.values()) {
    group.forEach((reading, index) => {
      const previous = group[index - 1];
      const gap = previous ? daysBetween(previous.readingDate, reading.readingDate) > GAP_THRESHOLD_DAYS : false;
      annotatedById.set(reading.id, {
        consumption: previous ? computeConsumption(previous.value, reading.value) : null,
        gap,
      });
    });
  }

  return readingsAscending.map((reading) => ({ ...reading, ...annotatedById.get(reading.id)! }));
}
