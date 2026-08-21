import { eq, and, ne, inArray, asc } from "drizzle-orm";
import { db } from "@/db";
import { repairs, attachments } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

export async function getRepairs() {
  const household = await getOrCreateHousehold();
  const rows = await db
    .select()
    .from(repairs)
    .where(eq(repairs.householdId, household.id))
    .orderBy(asc(repairs.reportedDate));

  if (rows.length === 0) {
    return { repairs: rows, attachmentsByRepair: new Map<string, (typeof attachments.$inferSelect)[]>() };
  }

  const repairIds = rows.map((r) => r.id);
  const attachmentRows = await db.select().from(attachments).where(inArray(attachments.repairId, repairIds));
  const attachmentsByRepair = new Map<string, (typeof attachments.$inferSelect)[]>();
  for (const attachment of attachmentRows) {
    if (!attachment.repairId) continue;
    const list = attachmentsByRepair.get(attachment.repairId) ?? [];
    list.push(attachment);
    attachmentsByRepair.set(attachment.repairId, list);
  }

  return { repairs: rows, attachmentsByRepair };
}

export type OpenRepairSummary = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "waiting" | "resolved"; // never actually "resolved" — filtered below
};

// For the dashboard (MAD-110's "surface open repairs" criterion) — repairs
// have no due date, so unlike bills/chores/maintenance/utilities/warranties
// they don't flow through getDueItems()'s date-bucketed pipeline at all.
// This is a small, separate query for a small, separate dashboard section.
export async function getOpenRepairsSummary(): Promise<OpenRepairSummary[]> {
  const household = await getOrCreateHousehold();
  return db
    .select({ id: repairs.id, title: repairs.title, priority: repairs.priority, status: repairs.status })
    .from(repairs)
    .where(and(eq(repairs.householdId, household.id), ne(repairs.status, "resolved")))
    .orderBy(asc(repairs.reportedDate));
}
