"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { repairs, attachments, activities } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { isValidDateOnly } from "@/lib/schedule";
import { deleteFile } from "@/lib/attachments/blob";

export type ActionResult = { success: true } | { success: false; error: string };
// The caller (CreateRepairDialog) needs the new row's id to attach a photo/
// document to it in a follow-up call — same two-step orchestration bills
// (MAD-96), documents (MAD-107), and inventory (MAD-108) already use.
export type CreateRepairResult = { success: true; repairId: string } | { success: false; error: string };

const PRIORITIES = ["low", "medium", "high"] as const;
type Priority = (typeof PRIORITIES)[number];
const STATUSES = ["open", "in_progress", "waiting", "resolved"] as const;
type RepairStatus = (typeof STATUSES)[number];

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

function readOptionalDate(formData: FormData, key: string, label: string): string | null {
  const value = readOptionalString(formData, key);
  if (value === null) return null;
  if (!isValidDateOnly(value)) {
    throw new Error(`${label} isn't a valid date.`);
  }
  return value;
}

function readOptionalCost(formData: FormData): string | null {
  const value = readOptionalString(formData, "cost");
  if (value === null) return null;
  if (Number.isNaN(Number(value)) || Number(value) < 0) {
    throw new Error("Cost must be a non-negative number.");
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

function readStatus(formData: FormData): RepairStatus {
  const value = formData.get("status");
  if (!STATUSES.includes(value as RepairStatus)) {
    throw new Error("Choose a status.");
  }
  return value as RepairStatus;
}

export async function createRepair(
  _prevState: CreateRepairResult | null,
  formData: FormData
): Promise<CreateRepairResult> {
  try {
    const household = await getOrCreateHousehold();
    const title = readRequiredString(formData, "title", "Title");
    const description = readOptionalString(formData, "description");
    const priority = readPriority(formData);
    const reportedDate = readRequiredDate(formData, "reportedDate", "Reported date");
    const contractor = readOptionalString(formData, "contractor");

    const [repair] = await db
      .insert(repairs)
      .values({ householdId: household.id, title, description, priority, reportedDate, contractor, status: "open" })
      .returning();

    revalidatePath("/repairs");
    revalidatePath("/");
    return { success: true, repairId: repair.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateRepair(
  repairId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(repairs)
      .where(and(eq(repairs.id, repairId), eq(repairs.householdId, household.id)));
    if (!existing) throw new Error("Repair not found.");

    const title = readRequiredString(formData, "title", "Title");
    const description = readOptionalString(formData, "description");
    const priority = readPriority(formData);
    const status = readStatus(formData);
    const reportedDate = readRequiredDate(formData, "reportedDate", "Reported date");
    const repairedDate = readOptionalDate(formData, "repairedDate", "Repaired date");
    const cost = readOptionalCost(formData);
    const contractor = readOptionalString(formData, "contractor");

    const wasResolved = existing.status === "resolved";
    await db
      .update(repairs)
      .set({ title, description, priority, status, reportedDate, repairedDate, cost, contractor, updatedAt: new Date() })
      .where(eq(repairs.id, repairId));

    // Manually editing status to "resolved" here (rather than via the quick
    // ResolveRepairDialog) should still log the activity — but only once,
    // the same idempotency ResolveRepairDialog's dedicated action doesn't
    // need to worry about since it's a one-way transition there.
    if (status === "resolved" && !wasResolved) {
      await db.insert(activities).values({
        householdId: household.id,
        type: "repair_resolved",
        description: `Resolved repair: ${title}`,
      });
    }

    revalidatePath("/repairs");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function resolveRepair(
  repairId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(repairs)
      .where(and(eq(repairs.id, repairId), eq(repairs.householdId, household.id)));
    if (!existing) throw new Error("Repair not found.");
    if (existing.status === "resolved") throw new Error("Repair is already resolved.");

    const repairedDate = readRequiredDate(formData, "repairedDate", "Repaired date");
    const cost = readOptionalCost(formData);

    await db
      .update(repairs)
      .set({ status: "resolved", repairedDate, cost, updatedAt: new Date() })
      .where(eq(repairs.id, repairId));

    await db.insert(activities).values({
      householdId: household.id,
      type: "repair_resolved",
      description: `Resolved repair: ${existing.title}`,
    });

    revalidatePath("/repairs");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteRepair(repairId: string): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(repairs)
      .where(and(eq(repairs.id, repairId), eq(repairs.householdId, household.id)));
    if (!existing) throw new Error("Repair not found.");

    // attachments cascade-deletes via its FK, but that only removes the DB
    // row — the underlying Blob file would leak forever otherwise. Same fix
    // as deleteMaintenanceItem (MAD-96) and deleteInventoryItem (MAD-108).
    const repairAttachments = await db.select().from(attachments).where(eq(attachments.repairId, repairId));
    await Promise.all(repairAttachments.map((a) => deleteFile(a.url)));

    await db.delete(repairs).where(eq(repairs.id, repairId));

    revalidatePath("/repairs");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
