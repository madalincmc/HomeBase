import type { NextRequest } from "next/server";
import { getOrCreateHousehold } from "@/lib/household";
import { composeSlotPayload } from "@/lib/push/compose";
import { isSlot, SCHEDULE_TO_SLOT, type Slot } from "@/lib/push/slots";
import { sendPushToHousehold } from "@/lib/push/send";

// web-push needs Node crypto, and this reads the database — never edge.
export const runtime = "nodejs";
// Must reflect live household state at the moment it runs.
export const dynamic = "force-dynamic";

function resolveSlot(request: NextRequest): Slot | null {
  // Explicit query param wins: it makes the endpoint testable by hand and
  // locally, where no cron header exists. `x-vercel-cron-schedule` is the
  // documented fallback for several cron entries sharing one path, in case
  // the query string isn't preserved through cron invocation.
  const fromQuery = request.nextUrl.searchParams.get("slot");
  if (isSlot(fromQuery)) return fromQuery;

  const schedule = request.headers.get("x-vercel-cron-schedule");
  if (schedule && SCHEDULE_TO_SLOT[schedule]) return SCHEDULE_TO_SLOT[schedule];

  return null;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const slot = resolveSlot(request);
  if (!slot) {
    return Response.json({ error: "Unknown slot" }, { status: 400 });
  }

  try {
    const household = await getOrCreateHousehold();

    // Recomputed from the database on every run rather than from anything
    // stored at schedule time, which is what makes this idempotent: Vercel
    // documents cron delivery as best-effort and occasionally duplicated, so
    // a repeated run simply recomputes the same state and re-sends. A missed
    // run is likewise self-correcting — the next slot picks everything up.
    const payload = await composeSlotPayload(household.id, slot);

    if (!payload) {
      return Response.json({ slot, skipped: "nothing due" });
    }

    const result = await sendPushToHousehold(household.id, payload);
    // Echo what was actually sent — the endpoint is secret-protected, and it
    // makes Vercel's cron logs self-documenting when a reminder looks wrong.
    return Response.json({ slot, ...result, title: payload.title, body: payload.body });
  } catch (err) {
    console.error(`[cron:notify:${slot}] failed`, err);
    return Response.json({ error: "Send failed" }, { status: 500 });
  }
}
