import { eq, ne, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { bills, chores, maintenanceItems, utilities, activities } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { getDueItems, type DueItem, type DueBucket } from "./get-due-items";
import { getOpenRepairsSummary, type OpenRepairSummary } from "@/lib/repairs/get-repairs";

export type DashboardItemKind = DueItem["kind"];
export type DashboardItem = DueItem;

export type DashboardBuckets = Record<DueBucket, DashboardItem[]>;

export type DashboardData = {
  householdName: string;
  buckets: DashboardBuckets;
  openRepairs: OpenRepairSummary[];
  overview: {
    utilities: number;
    chores: number;
    maintenanceItems: number;
    unpaidBills: number;
  };
  recentActivity: { id: string; description: string; occurredAt: Date }[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const household = await getOrCreateHousehold();
  const dueItems = await getDueItems();

  const buckets: DashboardBuckets = { overdue: [], dueToday: [], upcoming: [] };
  for (const item of dueItems) {
    buckets[item.bucket].push(item);
  }

  const [choreCount, maintenanceCount, utilityCount, unpaidBillCount, recentActivity, openRepairs] = await Promise.all([
    db.select().from(chores).where(eq(chores.householdId, household.id)),
    db.select().from(maintenanceItems).where(eq(maintenanceItems.householdId, household.id)),
    db.select().from(utilities).where(eq(utilities.householdId, household.id)),
    db.select().from(bills).where(and(eq(bills.householdId, household.id), ne(bills.status, "paid"))),
    db
      .select({ id: activities.id, description: activities.description, occurredAt: activities.occurredAt })
      .from(activities)
      .where(eq(activities.householdId, household.id))
      .orderBy(desc(activities.occurredAt))
      .limit(10),
    getOpenRepairsSummary(),
  ]);

  return {
    householdName: household.name,
    buckets,
    openRepairs,
    overview: {
      utilities: utilityCount.length,
      chores: choreCount.length,
      maintenanceItems: maintenanceCount.length,
      unpaidBills: unpaidBillCount.length,
    },
    recentActivity,
  };
}
