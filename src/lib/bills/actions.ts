"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bills, schedules, utilities, activities } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { computeNextOccurrence, isValidDateOnly } from "@/lib/schedule";

export type ActionResult = { success: true } | { success: false; error: string };
// The caller (CreateBillDialog) needs the new row's id to attach a photo/
// document to it in a follow-up call — see MAD-96.
export type CreateBillResult = { success: true; billId: string } | { success: false; error: string };

// Narrower than schedule_frequency, same reasoning as utilities' reading
// reminders (MAD-92): daily/weekly don't make sense for a bill.
const BILL_SCHEDULE_FREQUENCIES = ["monthly", "every_x_months", "yearly", "custom"] as const;

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

function readAmount(formData: FormData): string {
  const value = readRequiredString(formData, "amount", "Amount");
  if (Number.isNaN(Number(value)) || Number(value) <= 0) {
    throw new Error("Amount must be a positive number.");
  }
  return value;
}

function readUtilityId(formData: FormData): string | null {
  const value = formData.get("utilityId");
  return typeof value === "string" && value && value !== "none" ? value : null;
}

function parseScheduleFields(
  formData: FormData,
  dueDate: string
): { frequency: (typeof BILL_SCHEDULE_FREQUENCIES)[number]; interval: number; anchorDate: string } | null {
  const frequency = formData.get("scheduleFrequency");
  if (!frequency || frequency === "none") return null;
  if (!BILL_SCHEDULE_FREQUENCIES.includes(frequency as (typeof BILL_SCHEDULE_FREQUENCIES)[number])) {
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
  // The bill's own due date is the natural anchor — no separate "reminder
  // start date" input needed the way utilities' reading reminders had one.
  return { frequency: frequency as (typeof BILL_SCHEDULE_FREQUENCIES)[number], interval, anchorDate: dueDate };
}

async function assertUtilityBelongsToHousehold(utilityId: string | null, householdId: string) {
  if (!utilityId) return;
  const [utility] = await db
    .select()
    .from(utilities)
    .where(and(eq(utilities.id, utilityId), eq(utilities.householdId, householdId)));
  if (!utility) throw new Error("Utility not found.");
}

export async function createBill(
  _prevState: CreateBillResult | null,
  formData: FormData
): Promise<CreateBillResult> {
  try {
    const household = await getOrCreateHousehold();
    const title = readRequiredString(formData, "title", "Title");
    const provider = readOptionalString(formData, "provider");
    const amount = readAmount(formData);
    const currency = readRequiredString(formData, "currency", "Currency");
    const issueDate = readOptionalDate(formData, "issueDate", "Issue date");
    const dueDate = readRequiredDate(formData, "dueDate", "Due date");
    const utilityId = readUtilityId(formData);
    await assertUtilityBelongsToHousehold(utilityId, household.id);

    const scheduleFields = parseScheduleFields(formData, dueDate);
    let scheduleId: string | null = null;
    if (scheduleFields) {
      const [schedule] = await db.insert(schedules).values(scheduleFields).returning();
      scheduleId = schedule.id;
    }

    const [bill] = await db
      .insert(bills)
      .values({
        householdId: household.id,
        utilityId,
        scheduleId,
        title,
        provider,
        amount,
        currency,
        issueDate,
        dueDate,
        status: "upcoming",
      })
      .returning();

    revalidatePath("/bills");
    revalidatePath("/");
    return { success: true, billId: bill.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateBill(
  billId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, billId), eq(bills.householdId, household.id)));
    if (!existing) throw new Error("Bill not found.");

    const title = readRequiredString(formData, "title", "Title");
    const provider = readOptionalString(formData, "provider");
    const amount = readAmount(formData);
    const currency = readRequiredString(formData, "currency", "Currency");
    const issueDate = readOptionalDate(formData, "issueDate", "Issue date");
    const dueDate = readRequiredDate(formData, "dueDate", "Due date");
    const utilityId = readUtilityId(formData);
    await assertUtilityBelongsToHousehold(utilityId, household.id);

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
      // Recurrence cleared. Old schedule row left orphaned — same
      // documented trade-off as elsewhere (schedules aren't cascade-owned).
      scheduleId = null;
    }

    await db
      .update(bills)
      .set({ title, provider, amount, currency, issueDate, dueDate, utilityId, scheduleId, updatedAt: new Date() })
      .where(eq(bills.id, billId));

    revalidatePath("/bills");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function markBillPaid(
  billId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [bill] = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, billId), eq(bills.householdId, household.id)));
    if (!bill) throw new Error("Bill not found.");
    if (bill.status === "paid") throw new Error("Bill is already marked paid.");

    const paidDate = readRequiredDate(formData, "paidDate", "Payment date");

    await db
      .update(bills)
      .set({ status: "paid", paidDate, updatedAt: new Date() })
      .where(eq(bills.id, billId));

    await db.insert(activities).values({
      householdId: household.id,
      type: "bill_payment",
      description: `Paid ${bill.title}: ${bill.amount} ${bill.currency}`,
    });

    // Recurring bill: create the next period's bill now, anchored on the
    // due date that was just paid (not the payment date) — same convention
    // as the schedule engine everywhere else.
    if (bill.scheduleId) {
      const [schedule] = await db.select().from(schedules).where(eq(schedules.id, bill.scheduleId));
      const nextDue = schedule ? computeNextOccurrence(schedule, bill.dueDate) : null;
      if (nextDue) {
        await db.insert(bills).values({
          householdId: household.id,
          utilityId: bill.utilityId,
          scheduleId: bill.scheduleId,
          title: bill.title,
          provider: bill.provider,
          amount: bill.amount,
          currency: bill.currency,
          issueDate: null,
          dueDate: nextDue,
          status: "upcoming",
        });
      }
    }

    revalidatePath("/bills");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
