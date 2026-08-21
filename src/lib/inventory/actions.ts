"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { inventoryItems, rooms, attachments } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { isValidDateOnly } from "@/lib/schedule";
import { deleteFile } from "@/lib/attachments/blob";

export type ActionResult = { success: true } | { success: false; error: string };
// The caller (CreateInventoryItemDialog) needs the new row's id to attach a
// photo/receipt/manual to it in a follow-up call — same two-step
// orchestration bills (MAD-96) and documents (MAD-107) already use.
export type CreateInventoryItemResult = { success: true; itemId: string } | { success: false; error: string };

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

function readOptionalDate(formData: FormData, key: string, label: string): string | null {
  const value = readOptionalString(formData, key);
  if (value === null) return null;
  if (!isValidDateOnly(value)) {
    throw new Error(`${label} isn't a valid date.`);
  }
  return value;
}

function readOptionalPrice(formData: FormData): string | null {
  const value = readOptionalString(formData, "price");
  if (value === null) return null;
  if (Number.isNaN(Number(value)) || Number(value) < 0) {
    throw new Error("Price must be a non-negative number.");
  }
  return value;
}

function readRoomId(formData: FormData): string | null {
  const value = formData.get("roomId");
  return typeof value === "string" && value && value !== "none" ? value : null;
}

async function assertRoomBelongsToHousehold(roomId: string | null, householdId: string) {
  if (!roomId) return;
  const [room] = await db.select().from(rooms).where(and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)));
  if (!room) throw new Error("Room not found.");
}

function readFields(formData: FormData) {
  return {
    name: readRequiredString(formData, "name", "Name"),
    category: readOptionalString(formData, "category"),
    brand: readOptionalString(formData, "brand"),
    model: readOptionalString(formData, "model"),
    serialNumber: readOptionalString(formData, "serialNumber"),
    purchaseDate: readOptionalDate(formData, "purchaseDate", "Purchase date"),
    price: readOptionalPrice(formData),
  };
}

export async function createInventoryItem(
  _prevState: CreateInventoryItemResult | null,
  formData: FormData
): Promise<CreateInventoryItemResult> {
  try {
    const household = await getOrCreateHousehold();
    const fields = readFields(formData);
    const roomId = readRoomId(formData);
    await assertRoomBelongsToHousehold(roomId, household.id);

    const [item] = await db
      .insert(inventoryItems)
      .values({ householdId: household.id, roomId, ...fields })
      .returning();

    revalidatePath("/inventory");
    return { success: true, itemId: item.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function updateInventoryItem(
  itemId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.householdId, household.id)));
    if (!existing) throw new Error("Inventory item not found.");

    const fields = readFields(formData);
    const roomId = readRoomId(formData);
    await assertRoomBelongsToHousehold(roomId, household.id);

    await db
      .update(inventoryItems)
      .set({ roomId, ...fields, updatedAt: new Date() })
      .where(eq(inventoryItems.id, itemId));

    revalidatePath("/inventory");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteInventoryItem(itemId: string): Promise<ActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [existing] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.householdId, household.id)));
    if (!existing) throw new Error("Inventory item not found.");

    // attachments cascade-deletes via its FK, but that only removes the DB
    // row — the underlying Blob file would leak forever otherwise. Same fix
    // as deleteMaintenanceItem (MAD-96).
    const itemAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.inventoryItemId, itemId));
    await Promise.all(itemAttachments.map((a) => deleteFile(a.url)));

    await db.delete(inventoryItems).where(eq(inventoryItems.id, itemId));

    revalidatePath("/inventory");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
