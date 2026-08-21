import { eq, and, asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { utilities, schedules, meterReadings, meterPoints, attachments } from "@/db/schema";
import { getOrCreateHousehold } from "@/lib/household";
import { annotateReadingsWithConsumption } from "./consumption";

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

  const points = await db.select().from(meterPoints).where(eq(meterPoints.utilityId, utilityId)).orderBy(asc(meterPoints.name));
  const pointNameById = new Map(points.map((p) => [p.id, p.name]));

  // Fetched ascending (annotateReadingsWithConsumption needs that order to
  // compute deltas correctly), reversed to newest-first afterward for
  // display — reversing a list already sorted by (date, createdAt) yields a
  // valid descending order too.
  const readingsAscending = await db
    .select()
    .from(meterReadings)
    .where(eq(meterReadings.utilityId, utilityId))
    .orderBy(asc(meterReadings.readingDate), asc(meterReadings.createdAt));

  const readingIds = readingsAscending.map((r) => r.id);
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

  const annotated = annotateReadingsWithConsumption(readingsAscending);
  const readingsWithConsumption = annotated
    .map((reading) => ({
      ...reading,
      meterPointName: reading.meterPointId ? (pointNameById.get(reading.meterPointId) ?? null) : null,
      attachments: attachmentsByReading.get(reading.id) ?? [],
    }))
    .reverse();

  return { utility, schedule, meterPoints: points, readings: readingsWithConsumption };
}
