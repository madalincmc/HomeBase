"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { utilities, meterPoints } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

export type ActionResult = { success: true } | { success: false; error: string };

function readRequiredName(formData: FormData): string {
  const value = formData.get("name");
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Name is required.");
  }
  return value.trim();
}

async function requireOwnedUtility(utilityId: string) {
  const household = await getOrCreateHousehold();
  const [utility] = await db
    .select()
    .from(utilities)
    .where(and(eq(utilities.id, utilityId), eq(utilities.householdId, household.id)));
  if (!utility) throw new Error("Utility not found.");
  return utility;
}

export async function createMeterPoint(
  utilityId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireOwnedUtility(utilityId);
    const name = readRequiredName(formData);
    await db.insert(meterPoints).values({ utilityId, name });
    revalidatePath(`/utilities/${utilityId}`);
    revalidatePath("/utilities");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteMeterPoint(utilityId: string, meterPointId: string): Promise<ActionResult> {
  try {
    await requireOwnedUtility(utilityId);
    const [existing] = await db
      .select()
      .from(meterPoints)
      .where(and(eq(meterPoints.id, meterPointId), eq(meterPoints.utilityId, utilityId)));
    if (!existing) throw new Error("Meter point not found.");

    // meterReadings.meterPointId is ON DELETE SET NULL (see the schema
    // comment) — past readings recorded under this point are kept, just
    // unassigned, the same "removed safely" precedent rooms already
    // established. Nothing else to clean up here.
    await db.delete(meterPoints).where(eq(meterPoints.id, meterPointId));
    revalidatePath(`/utilities/${utilityId}`);
    revalidatePath("/utilities");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
