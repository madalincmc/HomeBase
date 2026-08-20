import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";

export async function getAttachmentsForMeterReading(meterReadingId: string) {
  return db.select().from(attachments).where(eq(attachments.meterReadingId, meterReadingId));
}

export async function getAttachmentsForBill(billId: string) {
  return db.select().from(attachments).where(eq(attachments.billId, billId));
}

export async function getAttachmentsForMaintenanceItem(maintenanceItemId: string) {
  return db.select().from(attachments).where(eq(attachments.maintenanceItemId, maintenanceItemId));
}
