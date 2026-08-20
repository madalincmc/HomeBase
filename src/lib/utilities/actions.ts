"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { utilities, schedules, meterReadings, activities } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { isValidDateOnly } from "@/lib/schedule";

export type ActionResult = { success: true } | { success: false; error: string };

const UTILITY_TYPES = ["electricity", "gas", "water"] as const;
// Narrower than the schema's full schedule_frequency enum — a reading
// reminder only makes sense as "monthly" or "custom" for this feature, per
// MAD-92's acceptance criteria; other frequencies are for chores/maintenance.
const READING_SCHEDULE_FREQUENCIES = ["monthly", "custom"] as const;

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

// A native <input type="date"> can submit something that isn't a real
// calendar date — found this the hard way in testing (see isValidDateOnly's
// comment). Validate here, at the boundary, rather than trusting it.
function readRequiredDate(formData: FormData, key: string, label: string): string {
  const value = readRequiredString(formData, key, label);
  if (!isValidDateOnly(value)) {
    throw new Error(`${label} isn't a valid date.`);
  }
  return value;
}

function parseUtilityType(formData: FormData): (typeof UTILITY_TYPES)[number] {
  const type = formData.get("type");
  if (!UTILITY_TYPES.includes(type as (typeof UTILITY_TYPES)[number])) {
    throw new Error("Choose a utility type.");
  }
  return type as (typeof UTILITY_TYPES)[number];
}

function parseScheduleFields(
  formData: FormData
): { frequency: (typeof READING_SCHEDULE_FREQUENCIES)[number]; anchorDate: string } | null {
  const frequency = formData.get("scheduleFrequency");
  if (!frequency || frequency === "none") return null;
  if (!READING_SCHEDULE_FREQUENCIES.includes(frequency as (typeof READING_SCHEDULE_FREQUENCIES)[number])) {
    throw new Error("Unsupported reading reminder frequency.");
  }
  const anchorDate = readRequiredDate(formData, "scheduleAnchorDate", "A start date");
  return { frequency: frequency as (typeof READING_SCHEDULE_FREQUENCIES)[number], anchorDate };
}

export async function createUtility(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const type = parseUtilityType(formData);
    const unit = readRequiredString(formData, "unit", "Unit");
    const provider = readOptionalString(formData, "provider");
    const accountReference = readOptionalString(formData, "accountReference");
    const scheduleFields = parseScheduleFields(formData);

    let scheduleId: string | null = null;
    if (scheduleFields) {
      const [schedule] = await db
        .insert(schedules)
        .values({ frequency: scheduleFields.frequency, interval: 1, anchorDate: scheduleFields.anchorDate })
        .returning();
      scheduleId = schedule.id;
    }

    await db.insert(utilities).values({
      householdId: household.id,
      type,
      provider,
      accountReference,
      unit,
      scheduleId,
    });

    revalidatePath("/utilities");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateUtility(
  utilityId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(utilities)
      .where(and(eq(utilities.id, utilityId), eq(utilities.householdId, household.id)));
    if (!existing) throw new Error("Utility not found.");

    const type = parseUtilityType(formData);
    const unit = readRequiredString(formData, "unit", "Unit");
    const provider = readOptionalString(formData, "provider");
    const accountReference = readOptionalString(formData, "accountReference");
    const scheduleFields = parseScheduleFields(formData);

    let scheduleId: string | null = existing.scheduleId;
    if (scheduleFields && existing.scheduleId) {
      await db
        .update(schedules)
        .set({ frequency: scheduleFields.frequency, anchorDate: scheduleFields.anchorDate, updatedAt: new Date() })
        .where(eq(schedules.id, existing.scheduleId));
    } else if (scheduleFields && !existing.scheduleId) {
      const [schedule] = await db
        .insert(schedules)
        .values({ frequency: scheduleFields.frequency, interval: 1, anchorDate: scheduleFields.anchorDate })
        .returning();
      scheduleId = schedule.id;
    } else if (!scheduleFields) {
      // Reminder cleared. The old schedule row (if any) is left in place,
      // orphaned — same trade-off documented elsewhere: schedules aren't
      // owned/cascaded by the entity that references them.
      scheduleId = null;
    }

    await db
      .update(utilities)
      .set({ type, provider, accountReference, unit, scheduleId, updatedAt: new Date() })
      .where(eq(utilities.id, utilityId));

    revalidatePath("/utilities");
    revalidatePath(`/utilities/${utilityId}`);
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function addMeterReading(
  utilityId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [utility] = await db
      .select()
      .from(utilities)
      .where(and(eq(utilities.id, utilityId), eq(utilities.householdId, household.id)));
    if (!utility) throw new Error("Utility not found.");

    const valueRaw = readRequiredString(formData, "value", "Reading value");
    if (Number.isNaN(Number(valueRaw))) {
      throw new Error("Reading value must be a number.");
    }
    const readingDate = readRequiredDate(formData, "readingDate", "Reading date");
    const notes = readOptionalString(formData, "notes");

    await db.insert(meterReadings).values({ utilityId, value: valueRaw, readingDate, notes });
    await db.insert(activities).values({
      householdId: household.id,
      type: "meter_reading",
      description: `Recorded ${utility.type} reading: ${valueRaw} ${utility.unit}`,
    });

    revalidatePath(`/utilities/${utilityId}`);
    revalidatePath("/utilities");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
