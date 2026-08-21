"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { uploadFile, deleteFile } from "./blob";

export type AttachmentActionResult = { success: true } | { success: false; error: string };

export type AttachmentParent =
  | { meterReadingId: string }
  | { billId: string }
  | { maintenanceItemId: string };

export async function uploadAttachment(
  parent: AttachmentParent,
  paths: string[],
  _prevState: AttachmentActionResult | null,
  formData: FormData
): Promise<AttachmentActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      // No file selected — attachments are optional everywhere they're used,
      // so this is a normal no-op, not an error.
      return { success: true };
    }
    const uploaded = await uploadFile(file, "attachments");

    await db.insert(attachments).values({
      householdId: household.id,
      ...parent,
      ...uploaded,
    });

    for (const path of paths) revalidatePath(path);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function deleteAttachment(
  attachmentId: string,
  paths: string[]
): Promise<AttachmentActionResult> {
  try {
    const household = await getOrCreateHousehold();
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.id, attachmentId), eq(attachments.householdId, household.id)));
    if (!attachment) throw new Error("Attachment not found.");

    await deleteFile(attachment.url);
    await db.delete(attachments).where(eq(attachments.id, attachmentId));

    for (const path of paths) revalidatePath(path);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
