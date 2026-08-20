"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { chores, schedules, rooms, taskOccurrences, activities } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { isValidDateOnly, completeTaskOccurrence, skipTaskOccurrence } from "@/lib/schedule";

export type ActionResult = { success: true } | { success: false; error: string };

const PRIORITIES = ["low", "medium", "high"] as const;
type Priority = (typeof PRIORITIES)[number];
// Unlike bills/utilities, chores realistically do recur daily or weekly, so
// this gets the full set the schema supports.
const CHORE_SCHEDULE_FREQUENCIES = ["daily", "weekly", "monthly", "every_x_months", "yearly", "custom"] as const;
type ChoreScheduleFrequency = (typeof CHORE_SCHEDULE_FREQUENCIES)[number];

function readRequiredString(formData: FormData, key: string, label: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function readOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRequiredDate(formData: FormData, key: string, label: string): string {
  const value = readRequiredString(formData, key, label);
  if (!isValidDateOnly(value)) {
    throw new Error(`${label} isn't a valid date.`);
  }
  return value;
}

function readPriority(formData: FormData): Priority {
  const value = formData.get("priority");
  if (!PRIORITIES.includes(value as Priority)) {
    throw new Error("Choose a priority.");
  }
  return value as Priority;
}

function readRoomId(formData: FormData): string | null {
  const value = formData.get("roomId");
  return typeof value === "string" && value && value !== "none" ? value : null;
}

function readEstimatedDurationMinutes(formData: FormData): number | null {
  const value = formData.get("estimatedDurationMinutes");
  if (typeof value !== "string" || !value.trim()) return null;
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error("Estimated duration must be a positive whole number of minutes.");
  }
  return minutes;
}

function parseScheduleFields(
  formData: FormData,
  dueDate: string
): { frequency: ChoreScheduleFrequency; interval: number; anchorDate: string } | null {
  const frequency = formData.get("scheduleFrequency");
  if (!frequency || frequency === "none") return null;
  if (!CHORE_SCHEDULE_FREQUENCIES.includes(frequency as ChoreScheduleFrequency)) {
    throw new Error("Unsupported recurrence frequency.");
  }
  let interval = 1;
  if (frequency === "every_x_months") {
    const raw = readRequiredString(formData, "scheduleInterval", "Interval");
    interval = Number(raw);
    if (!Number.isInteger(interval) || interval < 2) {
      throw new Error("Interval must be a whole number of at least 2 months.");
    }
  }
  return { frequency: frequency as ChoreScheduleFrequency, interval, anchorDate: dueDate };
}

async function assertRoomBelongsToHousehold(roomId: string | null, householdId: string) {
  if (!roomId) return;
  const [room] = await db.select().from(rooms).where(and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)));
  if (!room) throw new Error("Room not found.");
}

export async function createChore(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const title = readRequiredString(formData, "title", "Title");
    const description = readOptionalString(formData, "description");
    const roomId = readRoomId(formData);
    await assertRoomBelongsToHousehold(roomId, household.id);
    const priority = readPriority(formData);
    const assignee = readOptionalString(formData, "assignee");
    const estimatedDurationMinutes = readEstimatedDurationMinutes(formData);
    const dueDate = readRequiredDate(formData, "dueDate", "Due date");
    const scheduleFields = parseScheduleFields(formData, dueDate);

    let scheduleId: string | null = null;
    if (scheduleFields) {
      const [schedule] = await db.insert(schedules).values(scheduleFields).returning();
      scheduleId = schedule.id;
    }

    const [chore] = await db
      .insert(chores)
      .values({
        householdId: household.id,
        roomId,
        scheduleId,
        title,
        description,
        priority,
        assignee,
        estimatedDurationMinutes,
        nextDueDate: dueDate,
      })
      .returning();

    await db.insert(taskOccurrences).values({ choreId: chore.id, scheduledFor: dueDate });

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateChore(
  choreId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(chores)
      .where(and(eq(chores.id, choreId), eq(chores.householdId, household.id)));
    if (!existing) throw new Error("Chore not found.");

    const title = readRequiredString(formData, "title", "Title");
    const description = readOptionalString(formData, "description");
    const roomId = readRoomId(formData);
    await assertRoomBelongsToHousehold(roomId, household.id);
    const priority = readPriority(formData);
    const assignee = readOptionalString(formData, "assignee");
    const estimatedDurationMinutes = readEstimatedDurationMinutes(formData);
    const dueDate = readRequiredDate(formData, "dueDate", "Due date");
    const scheduleFields = parseScheduleFields(formData, dueDate);

    let scheduleId: string | null = existing.scheduleId;
    if (scheduleFields && existing.scheduleId) {
      await db
        .update(schedules)
        .set({ frequency: scheduleFields.frequency, interval: scheduleFields.interval, updatedAt: new Date() })
        .where(eq(schedules.id, existing.scheduleId));
    } else if (scheduleFields && !existing.scheduleId) {
      const [schedule] = await db.insert(schedules).values(scheduleFields).returning();
      scheduleId = schedule.id;
    } else if (!scheduleFields) {
      scheduleId = null; // orphans the old schedule row — documented pattern elsewhere
    }

    await db
      .update(chores)
      .set({
        title,
        description,
        roomId,
        priority,
        assignee,
        estimatedDurationMinutes,
        scheduleId,
        nextDueDate: dueDate,
        updatedAt: new Date(),
      })
      .where(eq(chores.id, choreId));

    // Editing the due date should move the chore's current pending
    // occurrence, not just the informational nextDueDate field — otherwise
    // the task list (which derives status from task_occurrences, not this
    // column) would ignore the edit entirely.
    const [pending] = await db
      .select()
      .from(taskOccurrences)
      .where(and(eq(taskOccurrences.choreId, choreId), eq(taskOccurrences.status, "pending")));
    if (pending && pending.scheduledFor !== dueDate) {
      await db
        .update(taskOccurrences)
        .set({ scheduledFor: dueDate, updatedAt: new Date() })
        .where(eq(taskOccurrences.id, pending.id));
    }

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteChore(choreId: string): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(chores)
      .where(and(eq(chores.id, choreId), eq(chores.householdId, household.id)));
    if (!existing) throw new Error("Chore not found.");

    // task_occurrences cascade-delete via the FK (MAD-87 schema).
    await db.delete(chores).where(eq(chores.id, choreId));

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

async function clearNextDueDateIfNoNextOccurrence(choreId: string, next: { scheduledFor: string } | null) {
  if (next) return;
  await db.update(chores).set({ nextDueDate: null, updatedAt: new Date() }).where(eq(chores.id, choreId));
}

export async function completeChoreOccurrence(occurrenceId: string): Promise<ActionResult> {
  try {
    const { completed, next } = await completeTaskOccurrence({ occurrenceId });
    if (!completed.choreId) throw new Error("Occurrence does not belong to a chore.");

    const household = await getOrCreateHousehold();
    const [chore] = await db.select().from(chores).where(eq(chores.id, completed.choreId));
    if (chore) {
      await db.insert(activities).values({
        householdId: household.id,
        type: "chore_completed",
        description: `Completed chore: ${chore.title}`,
      });
    }
    await clearNextDueDateIfNoNextOccurrence(completed.choreId, next);

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function skipChoreOccurrence(occurrenceId: string): Promise<ActionResult> {
  try {
    const { skipped, next } = await skipTaskOccurrence({ occurrenceId });
    if (!skipped.choreId) throw new Error("Occurrence does not belong to a chore.");

    const household = await getOrCreateHousehold();
    const [chore] = await db.select().from(chores).where(eq(chores.id, skipped.choreId));
    if (chore) {
      await db.insert(activities).values({
        householdId: household.id,
        type: "chore_skipped",
        description: `Skipped chore: ${chore.title}`,
      });
    }
    await clearNextDueDateIfNoNextOccurrence(skipped.choreId, next);

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
