"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { maintenanceItems, schedules, rooms, taskOccurrences, activities, attachments } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { isValidDateOnly, completeTaskOccurrence, skipTaskOccurrence, todayDateOnly } from "@/lib/schedule";

export type ActionResult = { success: true } | { success: false; error: string };

const PRIORITIES = ["low", "medium", "high"] as const;
type Priority = (typeof PRIORITIES)[number];
const MAINTENANCE_SCHEDULE_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "every_x_months",
  "yearly",
  "custom",
] as const;
type MaintenanceScheduleFrequency = (typeof MAINTENANCE_SCHEDULE_FREQUENCIES)[number];

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

function readOptionalCost(formData: FormData, key: string, label: string): string | null {
  const value = readOptionalString(formData, key);
  if (value === null) return null;
  if (Number.isNaN(Number(value)) || Number(value) < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return value;
}

function parseScheduleFields(
  formData: FormData,
  dueDate: string
): { frequency: MaintenanceScheduleFrequency; interval: number; anchorDate: string } | null {
  const frequency = formData.get("scheduleFrequency");
  if (!frequency || frequency === "none") return null;
  if (!MAINTENANCE_SCHEDULE_FREQUENCIES.includes(frequency as MaintenanceScheduleFrequency)) {
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
  return { frequency: frequency as MaintenanceScheduleFrequency, interval, anchorDate: dueDate };
}

async function assertRoomBelongsToHousehold(roomId: string | null, householdId: string) {
  if (!roomId) return;
  const [room] = await db.select().from(rooms).where(and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)));
  if (!room) throw new Error("Room not found.");
}

export async function createMaintenanceItem(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const title = readRequiredString(formData, "title", "Title");
    const description = readOptionalString(formData, "description");
    const category = readOptionalString(formData, "category");
    const roomId = readRoomId(formData);
    await assertRoomBelongsToHousehold(roomId, household.id);
    const relatedAppliance = readOptionalString(formData, "relatedAppliance");
    const priority = readPriority(formData);
    const estimatedCost = readOptionalCost(formData, "estimatedCost", "Estimated cost");
    const dueDate = readRequiredDate(formData, "dueDate", "Due date");
    const scheduleFields = parseScheduleFields(formData, dueDate);

    let scheduleId: string | null = null;
    if (scheduleFields) {
      const [schedule] = await db.insert(schedules).values(scheduleFields).returning();
      scheduleId = schedule.id;
    }

    const [item] = await db
      .insert(maintenanceItems)
      .values({
        householdId: household.id,
        roomId,
        scheduleId,
        title,
        description,
        category,
        relatedAppliance,
        priority,
        estimatedCost,
        nextDueDate: dueDate,
      })
      .returning();

    await db.insert(taskOccurrences).values({ maintenanceItemId: item.id, scheduledFor: dueDate });

    revalidatePath("/maintenance");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateMaintenanceItem(
  itemId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(maintenanceItems)
      .where(and(eq(maintenanceItems.id, itemId), eq(maintenanceItems.householdId, household.id)));
    if (!existing) throw new Error("Maintenance item not found.");

    const title = readRequiredString(formData, "title", "Title");
    const description = readOptionalString(formData, "description");
    const category = readOptionalString(formData, "category");
    const roomId = readRoomId(formData);
    await assertRoomBelongsToHousehold(roomId, household.id);
    const relatedAppliance = readOptionalString(formData, "relatedAppliance");
    const priority = readPriority(formData);
    const estimatedCost = readOptionalCost(formData, "estimatedCost", "Estimated cost");
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
      .update(maintenanceItems)
      .set({
        title,
        description,
        category,
        roomId,
        relatedAppliance,
        priority,
        estimatedCost,
        scheduleId,
        nextDueDate: dueDate,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceItems.id, itemId));

    // Same reasoning as chores: editing the due date should move the current
    // pending occurrence, since that's what drives the task list/dashboard,
    // not the informational nextDueDate column.
    const [pending] = await db
      .select()
      .from(taskOccurrences)
      .where(and(eq(taskOccurrences.maintenanceItemId, itemId), eq(taskOccurrences.status, "pending")));
    if (pending && pending.scheduledFor !== dueDate) {
      await db
        .update(taskOccurrences)
        .set({ scheduledFor: dueDate, updatedAt: new Date() })
        .where(eq(taskOccurrences.id, pending.id));
    }

    revalidatePath("/maintenance");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteMaintenanceItem(itemId: string): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(maintenanceItems)
      .where(and(eq(maintenanceItems.id, itemId), eq(maintenanceItems.householdId, household.id)));
    if (!existing) throw new Error("Maintenance item not found.");

    // task_occurrences and attachments both cascade-delete via their FK
    // (MAD-87 schema) — but that only removes the DB rows. The actual Blob
    // files behind any attachments would otherwise leak forever, since
    // nothing else ever calls del() on them. Clean those up first.
    const itemAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.maintenanceItemId, itemId));
    await Promise.all(itemAttachments.map((a) => del(a.url)));

    await db.delete(maintenanceItems).where(eq(maintenanceItems.id, itemId));

    revalidatePath("/maintenance");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

async function afterOccurrenceResolved(
  itemId: string,
  next: { scheduledFor: string } | null,
  completed: boolean
) {
  if (!next) {
    await db
      .update(maintenanceItems)
      .set({ nextDueDate: null, updatedAt: new Date() })
      .where(eq(maintenanceItems.id, itemId));
  }
  if (completed) {
    await db
      .update(maintenanceItems)
      .set({ lastCompletedAt: todayDateOnly(), updatedAt: new Date() })
      .where(eq(maintenanceItems.id, itemId));
  }
}

export async function completeMaintenanceOccurrence(
  occurrenceId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const cost = readOptionalCost(formData, "cost", "Cost");
    const notes = readOptionalString(formData, "notes");
    const { completed, next } = await completeTaskOccurrence({
      occurrenceId,
      cost: cost ?? undefined,
      notes: notes ?? undefined,
    });
    if (!completed.maintenanceItemId) throw new Error("Occurrence does not belong to a maintenance item.");

    const household = await getOrCreateHousehold();
    const [item] = await db
      .select()
      .from(maintenanceItems)
      .where(eq(maintenanceItems.id, completed.maintenanceItemId));
    if (item) {
      await db.insert(activities).values({
        householdId: household.id,
        type: "maintenance_completed",
        description: `Completed maintenance: ${item.title}`,
      });
    }
    await afterOccurrenceResolved(completed.maintenanceItemId, next, true);

    revalidatePath("/maintenance");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function skipMaintenanceOccurrence(occurrenceId: string): Promise<ActionResult> {
  try {
    const { skipped, next } = await skipTaskOccurrence({ occurrenceId });
    if (!skipped.maintenanceItemId) throw new Error("Occurrence does not belong to a maintenance item.");

    await afterOccurrenceResolved(skipped.maintenanceItemId, next, false);

    revalidatePath("/maintenance");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
