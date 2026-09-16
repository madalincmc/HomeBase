"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { utilities, schedules, meterReadings, meterPoints, activities, attachments } from "@/db/schema";
import { deleteFile } from "@/lib/attachments/blob";
import { getOrCreateHousehold } from "@/lib/household";
import { isValidDateOnly } from "@/lib/schedule";

export type ActionResult = { success: true } | { success: false; error: string };
// The caller (AddReadingForm) needs the new row's id to attach a photo to it
// in a follow-up call — see MAD-96.
export type AddMeterReadingResult =
  | { success: true; readingId: string }
  | { success: false; error: string };

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

// Every reading-level action has to prove the reading belongs to this
// household — readings are addressed by their own id, so the utility (and
// through it, the household) can only be reached by joining back up.
async function requireOwnedReading(readingId: string) {
  const household = await getOrCreateHousehold();
  const [row] = await db
    .select({ reading: meterReadings, utility: utilities })
    .from(meterReadings)
    .innerJoin(utilities, eq(meterReadings.utilityId, utilities.id))
    .where(and(eq(meterReadings.id, readingId), eq(utilities.householdId, household.id)));
  if (!row) throw new Error("Reading not found.");
  return row;
}

// Present only for a water-style utility with named meter points (see the
// schema comment on meterReadings.meterPointId) — every other utility just
// omits this field and behaves exactly as before. "none" is how the edit
// form clears an assignment, which a plain empty value can't express
// through a <Select>.
async function resolveMeterPointId(formData: FormData, utilityId: string): Promise<string | null> {
  const raw = readOptionalString(formData, "meterPointId");
  if (!raw || raw === "none") return null;
  const [point] = await db
    .select()
    .from(meterPoints)
    .where(and(eq(meterPoints.id, raw), eq(meterPoints.utilityId, utilityId)));
  if (!point) throw new Error("Meter point not found.");
  return point.id;
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
  _prevState: AddMeterReadingResult | null,
  formData: FormData
): Promise<AddMeterReadingResult> {
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

    const meterPointId = await resolveMeterPointId(formData, utilityId);
    let pointName: string | null = null;
    if (meterPointId) {
      const [point] = await db.select().from(meterPoints).where(eq(meterPoints.id, meterPointId));
      pointName = point?.name ?? null;
    }

    const [reading] = await db
      .insert(meterReadings)
      .values({ utilityId, meterPointId, value: valueRaw, readingDate, notes })
      .returning();
    await db.insert(activities).values({
      householdId: household.id,
      type: "meter_reading",
      description: pointName
        ? `Recorded ${utility.type} reading (${pointName}): ${valueRaw} ${utility.unit}`
        : `Recorded ${utility.type} reading: ${valueRaw} ${utility.unit}`,
    });

    revalidatePath(`/utilities/${utilityId}`);
    revalidatePath("/utilities");
    revalidatePath("/");
    return { success: true, readingId: reading.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

// Readings are still append-only in normal use — this is the correction
// path, for a value typed (or scanned) wrong and only noticed later. It
// deliberately mutates the row in place rather than writing a superseding
// one: consumption is the delta between consecutive readings, so a
// correction that left the wrong row behind would keep skewing the chart.
export async function updateMeterReading(
  readingId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { reading, utility } = await requireOwnedReading(readingId);

    const valueRaw = readRequiredString(formData, "value", "Reading value");
    if (Number.isNaN(Number(valueRaw))) {
      throw new Error("Reading value must be a number.");
    }
    const readingDate = readRequiredDate(formData, "readingDate", "Reading date");
    const notes = readOptionalString(formData, "notes");
    const meterPointId = await resolveMeterPointId(formData, utility.id);

    await db
      .update(meterReadings)
      .set({ value: valueRaw, readingDate, notes, meterPointId, updatedAt: new Date() })
      .where(eq(meterReadings.id, reading.id));

    revalidatePath(`/utilities/${utility.id}`);
    revalidatePath("/utilities");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteMeterReading(readingId: string): Promise<ActionResult> {
  try {
    const { reading, utility } = await requireOwnedReading(readingId);

    // attachments cascade-delete via their FK, but that only removes the DB
    // row — the Blob file behind it would leak forever, since nothing else
    // ever calls del() on it. Same fix deleteMaintenanceItem needed (MAD-96).
    const readingAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.meterReadingId, reading.id));
    await Promise.all(readingAttachments.map((a) => deleteFile(a.url)));

    await db.delete(meterReadings).where(eq(meterReadings.id, reading.id));

    // The activities row logged when this reading was added is deliberately
    // left in place — a log entry shouldn't vanish because its source row
    // was later removed (the same rule CLAUDE.md states for the unenforced
    // relatedEntity pointer pattern).
    revalidatePath(`/utilities/${utility.id}`);
    revalidatePath("/utilities");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
