import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { utilities, schedules, meterReadings, attachments } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { computeConsumption } from "./consumption";

export async function getUtilityDetail(utilityId: string) {
  const household = await getOrCreateHousehold();
  const [utility] = await db
    .select()
    .from(utilities)
    .where(and(eq(utilities.id, utilityId), eq(utilities.householdId, household.id)));
  if (!utility) return null;

  const schedule = utility.scheduleId
    ? ((await db.select().from(schedules).where(eq(schedules.id, utility.scheduleId)))[0] ?? null)
    : null;

  const readings = await db
    .select()
    .from(meterReadings)
    .where(eq(meterReadings.utilityId, utilityId))
    .orderBy(desc(meterReadings.readingDate), desc(meterReadings.createdAt));

  const readingIds = readings.map((r) => r.id);
  const readingAttachments =
    readingIds.length > 0
      ? await db.select().from(attachments).where(inArray(attachments.meterReadingId, readingIds))
      : [];
  const attachmentsByReading = new Map<string, typeof readingAttachments>();
  for (const attachment of readingAttachments) {
    if (!attachment.meterReadingId) continue;
    const list = attachmentsByReading.get(attachment.meterReadingId) ?? [];
    list.push(attachment);
    attachmentsByReading.set(attachment.meterReadingId, list);
  }

  // readings is newest-first, so the "previous" reading for consumption is
  // the next one along in this same array, not index - 1.
  const readingsWithConsumption = readings.map((reading, index) => {
    const previous = readings[index + 1];
    return {
      ...reading,
      consumption: previous ? computeConsumption(previous.value, reading.value) : null,
      attachments: attachmentsByReading.get(reading.id) ?? [],
    };
  });

  return { utility, schedule, readings: readingsWithConsumption };
}
