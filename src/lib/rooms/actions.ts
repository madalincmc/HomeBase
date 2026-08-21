"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";

export type ActionResult = { success: true } | { success: false; error: string };

const AFFECTED_PATHS = ["/settings", "/tasks", "/maintenance"] as const;

function readRequiredName(formData: FormData): string {
  const value = formData.get("name");
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Name is required.");
  }
  return value.trim();
}

export async function createRoom(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const name = readRequiredName(formData);
    await db.insert(rooms).values({ householdId: household.id, name });
    for (const path of AFFECTED_PATHS) revalidatePath(path);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateRoom(
  roomId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.householdId, household.id)));
    if (!existing) throw new Error("Room not found.");

    const name = readRequiredName(formData);
    await db.update(rooms).set({ name, updatedAt: new Date() }).where(eq(rooms.id, roomId));
    for (const path of AFFECTED_PATHS) revalidatePath(path);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteRoom(roomId: string): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.householdId, household.id)));
    if (!existing) throw new Error("Room not found.");

    // chores.roomId / maintenanceItems.roomId are ON DELETE SET NULL (MAD-87
    // schema) — deleting a room automatically unassigns it from anything
    // referencing it at the DB level, so there's nothing else to clean up
    // here. That's the "removed safely" the acceptance criteria asks for;
    // the confirmation dialog just makes the consequence visible up front.
    await db.delete(rooms).where(eq(rooms.id, roomId));
    for (const path of AFFECTED_PATHS) revalidatePath(path);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
