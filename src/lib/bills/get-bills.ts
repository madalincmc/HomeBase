import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bills, utilities, schedules } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

export async function getBills() {
  const household = await getOrCreateHousehold();

  const rows = await db
    .select({ bill: bills, utilityType: utilities.type })
    .from(bills)
    .leftJoin(utilities, eq(bills.utilityId, utilities.id))
    .where(eq(bills.householdId, household.id));

  const unpaid = rows
    .filter((r) => r.bill.status !== "paid")
    .sort((a, b) => a.bill.dueDate.localeCompare(b.bill.dueDate));
  const paid = rows
    .filter((r) => r.bill.status === "paid")
    .sort((a, b) => (b.bill.paidDate ?? "").localeCompare(a.bill.paidDate ?? ""));

  const scheduleIds = rows.map((r) => r.bill.scheduleId).filter((id): id is string => id !== null);
  const scheduleRows =
    scheduleIds.length > 0 ? await db.select().from(schedules).where(inArray(schedules.id, scheduleIds)) : [];
  const scheduleById = new Map(scheduleRows.map((s) => [s.id, s]));

  return { unpaid, paid, scheduleById };
}

export async function getHouseholdUtilities() {
  const household = await getOrCreateHousehold();
  return db
    .select({ id: utilities.id, type: utilities.type, provider: utilities.provider })
    .from(utilities)
    .where(eq(utilities.householdId, household.id))
    .orderBy(asc(utilities.type));
}
