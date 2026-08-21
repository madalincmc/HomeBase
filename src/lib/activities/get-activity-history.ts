import { eq, and, gte, lt, inArray, desc } from "drizzle-orm";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { activityTypeEnum } from "@/db/schema/enums";
import { getOrCreateHousehold } from "@/lib/household";
import type { DateOnly } from "@/lib/schedule";
import type { HouseholdCategory } from "@/lib/category";

type ActivityType = (typeof activityTypeEnum.enumValues)[number];

// Maps each of the 6 activity_type enum values (schema/enums.ts) onto the
// same 5-category taxonomy the dashboard and notifications use. Two chore
// events collapse into one category since "chore" is the granularity users
// filter by, not "completed vs. skipped".
const TYPES_BY_CATEGORY: Record<HouseholdCategory, ActivityType[]> = {
  utility: ["meter_reading"],
  bill: ["bill_payment"],
  chore: ["chore_completed", "chore_skipped"],
  maintenance: ["maintenance_completed"],
  repair: ["repair_resolved"],
};

const CATEGORY_BY_TYPE = Object.fromEntries(
  Object.entries(TYPES_BY_CATEGORY).flatMap(([category, types]) => types.map((type) => [type, category]))
) as Record<ActivityType, HouseholdCategory>;

export type ActivityHistoryFilters = {
  category?: HouseholdCategory;
  from?: DateOnly;
  to?: DateOnly;
};

export type ActivityHistoryEntry = {
  id: string;
  description: string;
  category: HouseholdCategory;
  occurredAt: Date;
};

// No pagination in MVP — same call as the notification center's fixed
// limit. A full-history power-user view is Phase 2 analytics territory, not
// this issue's scope.
const HISTORY_LIMIT = 100;

export async function getActivityHistory(filters: ActivityHistoryFilters): Promise<ActivityHistoryEntry[]> {
  const household = await getOrCreateHousehold();

  const conditions = [eq(activities.householdId, household.id)];
  if (filters.category) {
    conditions.push(inArray(activities.type, TYPES_BY_CATEGORY[filters.category]));
  }
  if (filters.from) {
    conditions.push(gte(activities.occurredAt, new Date(`${filters.from}T00:00:00.000Z`)));
  }
  if (filters.to) {
    // Exclusive upper bound of the day *after* `to`, so the entire `to` day
    // is included regardless of what time of day each activity occurred —
    // same UTC-anchored DateOnly convention used everywhere else.
    const toExclusive = new Date(`${filters.to}T00:00:00.000Z`);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    conditions.push(lt(activities.occurredAt, toExclusive));
  }

  const rows = await db
    .select()
    .from(activities)
    .where(and(...conditions))
    .orderBy(desc(activities.occurredAt))
    .limit(HISTORY_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    category: CATEGORY_BY_TYPE[row.type],
    occurredAt: row.occurredAt,
  }));
}
