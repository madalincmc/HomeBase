import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { bills } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

const UNCATEGORIZED = "Uncategorized";

export type CategoryTotal = { category: string; total: number };

export type PeriodCost = {
  key: string; // "2026-08" for a month, "2026" for a year
  label: string;
  total: number;
  // vs. the immediately preceding period, null when there's no prior period
  // to compare against (the earliest period on record).
  changePercent: number | null;
  categories: CategoryTotal[]; // sorted descending by total
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

function formatMonthLabel(month: string): string {
  return MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00Z`));
}

function categorize(rows: { category: string | null; amount: string }[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = row.category ?? UNCATEGORIZED;
    totals.set(key, (totals.get(key) ?? 0) + Number(row.amount));
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total);
}

function buildPeriods(
  buckets: Map<string, { category: string | null; amount: string }[]>,
  labelFor: (key: string) => string
): PeriodCost[] {
  const sortedKeys = [...buckets.keys()].sort();
  return sortedKeys.map((key, index) => {
    const rows = buckets.get(key)!;
    const total = Number(rows.reduce((sum, r) => sum + Number(r.amount), 0).toFixed(2));
    const previousKey = sortedKeys[index - 1];
    const previousTotal = previousKey
      ? buckets.get(previousKey)!.reduce((sum, r) => sum + Number(r.amount), 0)
      : null;
    const changePercent =
      previousTotal !== null && previousTotal !== 0
        ? Number((((total - previousTotal) / previousTotal) * 100).toFixed(1))
        : null;
    return { key, label: labelFor(key), total, changePercent, categories: categorize(rows) };
  });
}

// Paid bills only — "spend" means money that actually left the household,
// not what's upcoming. Grouped in JS rather than SQL: a personal household's
// bill history is a tiny dataset, and this keeps the same style as
// getConsumptionHistory (MAD-105) rather than mixing aggregation styles.
//
// Totals are summed as plain numbers with no currency conversion — HomeBase
// is single-household/no-multi-currency-support by design (bills.currency is
// free text the user types per bill). `currency` below is just the most
// common currency across paid bills, for display; a household that genuinely
// mixes currencies would get a nonsensical total, but that's out of scope
// for a personal app's MVP, same trade-off as consumption's undetected meter
// resets.
export async function getCostAnalytics(): Promise<{
  monthly: PeriodCost[];
  yearly: PeriodCost[];
  currency: string | null;
}> {
  const household = await getOrCreateHousehold();
  const paidBills = await db
    .select({ paidDate: bills.paidDate, category: bills.category, amount: bills.amount, currency: bills.currency })
    .from(bills)
    .where(and(eq(bills.householdId, household.id), eq(bills.status, "paid")));

  const monthlyBuckets = new Map<string, { category: string | null; amount: string }[]>();
  const yearlyBuckets = new Map<string, { category: string | null; amount: string }[]>();
  const currencyCounts = new Map<string, number>();
  for (const bill of paidBills) {
    if (!bill.paidDate) continue; // shouldn't happen for a "paid" bill, but don't let a bad row crash the page
    const month = bill.paidDate.slice(0, 7);
    const year = bill.paidDate.slice(0, 4);
    const row = { category: bill.category, amount: bill.amount };
    (monthlyBuckets.get(month) ?? monthlyBuckets.set(month, []).get(month)!).push(row);
    (yearlyBuckets.get(year) ?? yearlyBuckets.set(year, []).get(year)!).push(row);
    currencyCounts.set(bill.currency, (currencyCounts.get(bill.currency) ?? 0) + 1);
  }
  const currency = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    monthly: buildPeriods(monthlyBuckets, formatMonthLabel),
    yearly: buildPeriods(yearlyBuckets, (year) => year),
    currency,
  };
}
