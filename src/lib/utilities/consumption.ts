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
