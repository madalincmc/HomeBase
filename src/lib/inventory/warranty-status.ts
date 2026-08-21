import type { DateOnly } from "@/lib/schedule/compute-next-occurrence";

export type WarrantyStatus = "active" | "expiring_soon" | "expired";

// Mirrors getDueItems()'s UPCOMING_WINDOW_DAYS (dashboard.ts) rather than
// importing it — that module pulls in @/db (the pg driver), and this file
// needs to stay safe to import from a Client Component (see the MAD-98
// barrel-import note in CLAUDE.md) if a live status preview is ever added.
const UPCOMING_WINDOW_DAYS = 14;

// Computed from the stored date vs. today, the same pattern as
// getBillDisplayStatus() — nothing writes a stored status, so a day rolling
// forward alone keeps this correct with no background job. Returns null
// when there's no expiration date to judge (warranty info wasn't entered).
export function getWarrantyStatus(expirationDate: DateOnly | null, today: DateOnly): WarrantyStatus | null {
  if (!expirationDate) return null;
  if (expirationDate < today) return "expired";
  const windowEnd = addDays(today, UPCOMING_WINDOW_DAYS);
  if (expirationDate <= windowEnd) return "expiring_soon";
  return "active";
}

function addDays(date: DateOnly, days: number): DateOnly {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10) as DateOnly;
}
