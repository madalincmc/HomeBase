import { eq } from "drizzle-orm";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";
import { db } from "@/db";
import { taskOccurrences, chores, maintenanceItems, schedules } from "@/db/schema";
import { computeNextOccurrence } from "./compute-next-occurrence";

type TaskOccurrence = typeof taskOccurrences.$inferSelect;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = NodePgTransaction<any, any>;

async function scheduleNextOccurrence(
  tx: Tx,
  occurrence: TaskOccurrence
): Promise<TaskOccurrence | null> {
  if (occurrence.choreId) {
    const [parent] = await tx.select().from(chores).where(eq(chores.id, occurrence.choreId));
    if (!parent?.scheduleId) return null;

    const [schedule] = await tx.select().from(schedules).where(eq(schedules.id, parent.scheduleId));
    if (!schedule) return null;

    const nextDate = computeNextOccurrence(schedule, occurrence.scheduledFor);
    if (!nextDate) return null;

    const [next] = await tx
      .insert(taskOccurrences)
      .values({ choreId: parent.id, scheduledFor: nextDate })
      .returning();
    await tx
      .update(chores)
      .set({ nextDueDate: nextDate, updatedAt: new Date() })
      .where(eq(chores.id, parent.id));
    return next;
  }

  if (occurrence.maintenanceItemId) {
    const [parent] = await tx
      .select()
      .from(maintenanceItems)
      .where(eq(maintenanceItems.id, occurrence.maintenanceItemId));
    if (!parent?.scheduleId) return null;

    const [schedule] = await tx.select().from(schedules).where(eq(schedules.id, parent.scheduleId));
    if (!schedule) return null;

    const nextDate = computeNextOccurrence(schedule, occurrence.scheduledFor);
    if (!nextDate) return null;

    const [next] = await tx
      .insert(taskOccurrences)
      .values({ maintenanceItemId: parent.id, scheduledFor: nextDate })
      .returning();
    await tx
      .update(maintenanceItems)
      .set({ nextDueDate: nextDate, updatedAt: new Date() })
      .where(eq(maintenanceItems.id, parent.id));
    return next;
  }

  // Unreachable given the exactly-one-parent CHECK constraint on this table.
  return null;
}

async function loadPendingOccurrence(tx: Tx, occurrenceId: string): Promise<TaskOccurrence> {
  const [occurrence] = await tx
    .select()
    .from(taskOccurrences)
    .where(eq(taskOccurrences.id, occurrenceId));
  if (!occurrence) {
    throw new Error(`Task occurrence ${occurrenceId} not found`);
  }
  if (occurrence.status !== "pending") {
    throw new Error(`Task occurrence ${occurrenceId} is already ${occurrence.status}`);
  }
  return occurrence;
}

export type CompleteTaskOccurrenceInput = {
  occurrenceId: string;
  completedAt?: Date;
  notes?: string;
  cost?: string;
};

/**
 * Marks an occurrence completed and, if its parent chore/maintenance item
 * has a schedule, creates the next pending occurrence in the same
 * transaction — this is what "completing an occurrence preserves history
 * and schedules the next occurrence" means at the data layer. Returns null
 * for `next` when the task is one-off (no schedule) or the schedule is
 * "custom" (next date needs a human to pick it).
 */
export async function completeTaskOccurrence({
  occurrenceId,
  completedAt,
  notes,
  cost,
}: CompleteTaskOccurrenceInput) {
  return db.transaction(async (tx) => {
    const occurrence = await loadPendingOccurrence(tx, occurrenceId);

    const [completed] = await tx
      .update(taskOccurrences)
      .set({
        status: "completed",
        completedAt: completedAt ?? new Date(),
        notes: notes ?? occurrence.notes,
        cost: cost ?? occurrence.cost,
        updatedAt: new Date(),
      })
      .where(eq(taskOccurrences.id, occurrenceId))
      .returning();

    const next = await scheduleNextOccurrence(tx, occurrence);
    return { completed, next };
  });
}

export type SkipTaskOccurrenceInput = {
  occurrenceId: string;
  notes?: string;
};

/** Same next-occurrence scheduling as completeTaskOccurrence, but for a skip. */
export async function skipTaskOccurrence({ occurrenceId, notes }: SkipTaskOccurrenceInput) {
  return db.transaction(async (tx) => {
    const occurrence = await loadPendingOccurrence(tx, occurrenceId);

    const [skipped] = await tx
      .update(taskOccurrences)
      .set({ status: "skipped", notes: notes ?? occurrence.notes, updatedAt: new Date() })
      .where(eq(taskOccurrences.id, occurrenceId))
      .returning();

    const next = await scheduleNextOccurrence(tx, occurrence);
    return { skipped, next };
  });
}
