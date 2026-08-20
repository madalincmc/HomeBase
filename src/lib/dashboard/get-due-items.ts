import type { Route } from "next";
import { eq, and, ne, inArray, desc } from "drizzle-orm";
import { db } from "@/db";
import { bills, chores, maintenanceItems, taskOccurrences, utilities, meterReadings, schedules, rooms } from "@/db/schema";
import { computeNextOccurrence, todayDateOnly, type DateOnly } from "@/lib/schedule";
import { getOrCreateHousehold } from "@/lib/household";

export type DueItemKind = "bill" | "chore" | "maintenance" | "utility";
export type DueBucket = "overdue" | "dueToday" | "upcoming";

export type DueItem = {
  id: string;
  kind: DueItemKind;
  title: string;
  dueDate: DateOnly;
  href: Route;
  meta?: string;
  bucket: DueBucket;
};

const UPCOMING_WINDOW_DAYS = 14;
// Utility items link to their specific /utilities/[id] page instead — computed
// per-item below, since (unlike these three) that route actually exists.
const HREF_BY_KIND: Record<Exclude<DueItemKind, "utility">, Route> = {
  bill: "/bills",
  chore: "/tasks",
  maintenance: "/maintenance",
};

function bucketOf(dueDate: DateOnly, today: DateOnly, windowEnd: DateOnly): DueBucket | null {
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "dueToday";
  if (dueDate <= windowEnd) return "upcoming";
  return null;
}

// Shared by the dashboard (MAD-91) and the notification sync (MAD-98) — both
// need the same "what's overdue/due today/upcoming across bills, chores,
// maintenance, and utilities" computation, so it lives here once rather than
// being duplicated.
export async function getDueItems(): Promise<DueItem[]> {
  const household = await getOrCreateHousehold();
  const today = todayDateOnly();
  const windowEnd = computeNextOccurrence({ frequency: "daily", interval: UPCOMING_WINDOW_DAYS }, today)!;

  const items: DueItem[] = [];
  function place(item: Omit<DueItem, "bucket">) {
    const bucket = bucketOf(item.dueDate, today, windowEnd);
    if (bucket) items.push({ ...item, bucket });
  }

  // Bills: anything not marked paid, regardless of the stored `status`
  // column — nothing updates that automatically yet, so dueDate is the
  // source of truth for overdue/today/upcoming.
  const unpaidBills = await db
    .select()
    .from(bills)
    .where(and(eq(bills.householdId, household.id), ne(bills.status, "paid")));
  for (const bill of unpaidBills) {
    place({
      id: bill.id,
      kind: "bill",
      title: bill.title,
      dueDate: bill.dueDate,
      href: HREF_BY_KIND.bill,
      meta: `${bill.amount} ${bill.currency}`,
    });
  }

  // Chores + maintenance: pending task_occurrences, joined to their parent
  // for a title and optional room.
  const pendingChoreOccurrences = await db
    .select({
      id: taskOccurrences.id,
      scheduledFor: taskOccurrences.scheduledFor,
      title: chores.title,
      room: rooms.name,
    })
    .from(taskOccurrences)
    .innerJoin(chores, eq(taskOccurrences.choreId, chores.id))
    .leftJoin(rooms, eq(chores.roomId, rooms.id))
    .where(and(eq(chores.householdId, household.id), eq(taskOccurrences.status, "pending")));
  for (const occurrence of pendingChoreOccurrences) {
    place({
      id: occurrence.id,
      kind: "chore",
      title: occurrence.title,
      dueDate: occurrence.scheduledFor,
      href: HREF_BY_KIND.chore,
      meta: occurrence.room ?? undefined,
    });
  }

  const pendingMaintenanceOccurrences = await db
    .select({
      id: taskOccurrences.id,
      scheduledFor: taskOccurrences.scheduledFor,
      title: maintenanceItems.title,
      room: rooms.name,
    })
    .from(taskOccurrences)
    .innerJoin(maintenanceItems, eq(taskOccurrences.maintenanceItemId, maintenanceItems.id))
    .leftJoin(rooms, eq(maintenanceItems.roomId, rooms.id))
    .where(
      and(eq(maintenanceItems.householdId, household.id), eq(taskOccurrences.status, "pending"))
    );
  for (const occurrence of pendingMaintenanceOccurrences) {
    place({
      id: occurrence.id,
      kind: "maintenance",
      title: occurrence.title,
      dueDate: occurrence.scheduledFor,
      href: HREF_BY_KIND.maintenance,
      meta: occurrence.room ?? undefined,
    });
  }

  // Utilities: no stored "next reading due" column (unlike chores/
  // maintenance) — compute it from the schedule, anchored on the most
  // recent actual reading (or the schedule's anchor date if there isn't one
  // yet). Utilities with no schedule just don't get reading reminders.
  const householdUtilities = await db
    .select()
    .from(utilities)
    .where(eq(utilities.householdId, household.id));

  const scheduledUtilities = householdUtilities.filter((u) => u.scheduleId);
  if (scheduledUtilities.length > 0) {
    const scheduleIds = scheduledUtilities.map((u) => u.scheduleId!);
    const utilitySchedules = await db.select().from(schedules).where(inArray(schedules.id, scheduleIds));
    const scheduleById = new Map(utilitySchedules.map((s) => [s.id, s]));

    const utilityIds = scheduledUtilities.map((u) => u.id);
    const readings = await db
      .select()
      .from(meterReadings)
      .where(inArray(meterReadings.utilityId, utilityIds))
      .orderBy(desc(meterReadings.readingDate));
    const latestReadingByUtility = new Map<string, DateOnly>();
    for (const reading of readings) {
      if (!latestReadingByUtility.has(reading.utilityId)) {
        latestReadingByUtility.set(reading.utilityId, reading.readingDate);
      }
    }

    for (const utility of scheduledUtilities) {
      const schedule = scheduleById.get(utility.scheduleId!);
      if (!schedule) continue;
      const anchor = latestReadingByUtility.get(utility.id) ?? schedule.anchorDate;
      const nextDue = computeNextOccurrence(schedule, anchor);
      if (!nextDue) continue; // custom schedule — no formula, nothing to auto-surface
      place({
        id: utility.id,
        kind: "utility",
        title: `${utility.type} reading`,
        dueDate: nextDue,
        href: `/utilities/${utility.id}`,
      });
    }
  }

  items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return items;
}
