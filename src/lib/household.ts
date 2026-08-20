import { db } from "@/db";
import { households } from "@/db/schema";

// MVP has exactly one household and no onboarding flow (that's MAD-102) — so
// rather than gate every page on "no household exists yet", the first page
// load that needs one just creates it. The tiny race on two concurrent
// first-ever requests both inserting isn't worth guarding against for a
// single-user household app.
export async function getOrCreateHousehold() {
  const [existing] = await db.select().from(households).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(households).values({ name: "My Household" }).returning();
  return created;
}
