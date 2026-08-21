"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { documents, bills, maintenanceItems, inventoryItems, rooms } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { uploadFile, deleteFile } from "@/lib/attachments/blob";

export type DocumentActionResult = { success: true } | { success: false; error: string };

// "inventory_item" added in MAD-108 — this is the exact extension MAD-107's
// schema comment anticipated: a new linkable type needs no migration here,
// just a new case in this array and the two functions below.
const LINKABLE_TYPES = ["bill", "maintenance_item", "inventory_item"] as const;

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

function readRoomId(formData: FormData): string | null {
  const value = formData.get("roomId");
  return typeof value === "string" && value && value !== "none" ? value : null;
}

// The "link to" field is a single select combining both linkable types
// (see DocumentFormFields) — its value is "type:id", or "none".
function readLink(formData: FormData): { relatedEntityType: string | null; relatedEntityId: string | null } {
  const raw = formData.get("link");
  if (typeof raw !== "string" || raw === "none") return { relatedEntityType: null, relatedEntityId: null };
  const [type, id] = raw.split(":");
  if (!LINKABLE_TYPES.includes(type as (typeof LINKABLE_TYPES)[number]) || !id) {
    throw new Error("Invalid link selection.");
  }
  return { relatedEntityType: type, relatedEntityId: id };
}

async function assertLinkBelongsToHousehold(
  link: { relatedEntityType: string | null; relatedEntityId: string | null },
  householdId: string
) {
  if (!link.relatedEntityType || !link.relatedEntityId) return;
  if (link.relatedEntityType === "bill") {
    const [row] = await db
      .select({ id: bills.id })
      .from(bills)
      .where(and(eq(bills.id, link.relatedEntityId), eq(bills.householdId, householdId)));
    if (!row) throw new Error("Linked bill not found.");
  } else if (link.relatedEntityType === "maintenance_item") {
    const [row] = await db
      .select({ id: maintenanceItems.id })
      .from(maintenanceItems)
      .where(and(eq(maintenanceItems.id, link.relatedEntityId), eq(maintenanceItems.householdId, householdId)));
    if (!row) throw new Error("Linked maintenance item not found.");
  } else if (link.relatedEntityType === "inventory_item") {
    const [row] = await db
      .select({ id: inventoryItems.id })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, link.relatedEntityId), eq(inventoryItems.householdId, householdId)));
    if (!row) throw new Error("Linked inventory item not found.");
  }
}

async function assertRoomBelongsToHousehold(roomId: string | null, householdId: string) {
  if (!roomId) return;
  const [room] = await db.select().from(rooms).where(and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)));
  if (!room) throw new Error("Room not found.");
}

export async function createDocument(
  _prevState: DocumentActionResult | null,
  formData: FormData
): Promise<DocumentActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const title = readRequiredString(formData, "title", "Title");
    const category = readOptionalString(formData, "category");
    const notes = readOptionalString(formData, "notes");
    const roomId = readRoomId(formData);
    await assertRoomBelongsToHousehold(roomId, household.id);
    const link = readLink(formData);
    await assertLinkBelongsToHousehold(link, household.id);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Choose a file to upload.");
    }
    const uploaded = await uploadFile(file, "documents");

    await db.insert(documents).values({
      householdId: household.id,
      title,
      category,
      notes,
      roomId,
      relatedEntityType: link.relatedEntityType,
      relatedEntityId: link.relatedEntityId,
      ...uploaded,
    });

    revalidatePath("/documents");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteDocument(documentId: string): Promise<DocumentActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.householdId, household.id)));
    if (!document) throw new Error("Document not found.");

    await deleteFile(document.url);
    await db.delete(documents).where(eq(documents.id, documentId));

    revalidatePath("/documents");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
