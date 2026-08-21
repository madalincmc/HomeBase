# HomeBase

A household operating system for utilities, bills, chores, maintenance, and the other recurring
responsibilities of running a home.

**The desktop tells you what is happening in your home. Mobile helps you take care of it.**

Live at **https://homebase-iota-three.vercel.app** — single household, no login.

---

## Status

**MVP feature-complete, plus Phase 2 and Phase 3.** In daily use.

| Phase | Scope | State |
| --- | --- | --- |
| MVP | Dashboard, utilities, bills, chores, maintenance, attachments, notifications, history, rooms, quick actions | ✅ Shipped |
| Phase 2 | Bill & meter-reading OCR, consumption analytics, cost analytics, document vault | ✅ Shipped |
| Phase 3 | Home inventory, warranty tracking, repair management | ✅ Shipped |
| — | Web push reminders (scheduled daily briefings) | ✅ Shipped |
| Remaining MVP | Settings/household config, final QA pass | ⬜ Open |
| Phase 4–5 | Anomaly detection, proactive insights, smart notifications, integrations | ⬜ Backlog |

There is **no authentication** — anyone with the URL can see and edit everything. The schema
models a `Household` entity so multi-household and auth can be added later without a redesign.

---

## Features

**Daily operation**
- **Dashboard** — what's due today, what's overdue, what's coming in 14 days, open repairs, household stats, recent activity. Reorders itself on mobile to put overdue first.
- **Reminders** — three scheduled push notifications a day (morning briefing, midday progress, evening wrap-up) that arrive even when the app is closed. See [Reminders](#reminders) below.
- **Quick actions** — mobile FAB opening the four creation flows directly.

**Tracking**
- **Utilities** — electricity/gas/water meter readings, consumption deltas, monthly and per-reading charts with gap detection, per-utility switching.
- **Bills** — one-off and recurring, payment history, spending analytics by month/year with category breakdown and trend comparison.
- **Chores** — recurring tasks with full daily→yearly recurrence, completion history.
- **Maintenance** — recurring upkeep with cost and photo capture at completion.
- **Repairs** — one-off problems with an Open → In Progress → Waiting → Resolved workflow, contractor and cost.
- **Inventory** — appliances and assets with brand, model, serial, purchase price.
- **Warranties** — expiration tracking that surfaces on the dashboard and in reminders.
- **Documents** — searchable vault for receipts, warranties, manuals and contracts, linkable to bills, maintenance items and inventory.

**Assistance**
- **AI scanning** — photograph a bill or a meter, and Gemini pre-fills the form. Every field stays editable; a failed scan just leaves the normal manual form untouched.
- **History** — filterable chronological log of everything done.
- **Rooms** — organise tasks, maintenance, inventory and documents by area.

---

## Getting started

```bash
npm install
vercel env pull .env.local     # fetches real values; see .env.example for what each is
npm run dev
```

Open http://localhost:3000.

`.env.example` documents every variable. Only the database is strictly required — without the
Gemini key the AI scan buttons fail gracefully, and without the VAPID keys push reminders are
simply unavailable.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Node's built-in runner via `tsx`) |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |

Run `lint`, `tsc --noEmit`, `test` and `build` before shipping — the `/deploy` skill gates on all
four.

---

## Reminders

The part you'll interact with most, and the part most worth understanding.

### Turning them on

Open the app → **bell icon** → **Enable**. You'll see *"Daily reminders are on for this device."*

Each browser is a **separate subscription** — enable it on every device you want notified.

> **On iPhone you must add HomeBase to your Home Screen first**, and open it from that icon.
> Apple doesn't expose notifications to a normal Safari tab. **Don't delete the icon** — that
> kills the subscription.

### What arrives

Three check-ins a day, each worded for the time of day, and **only when something is actually
outstanding** — nothing due means no notification at all, by design.

| Slot | Local (summer) | Example |
| --- | --- | --- |
| Morning | ~08:00 | *Good morning* — "1 overdue item, 2 due today — Water bill, Electricity reading" |
| Noon | ~12:00 | *Midday check-in* — "3 tasks done so far. 2 still to go — …" |
| Evening | ~19:00 | *Before the day ends* — "2 tasks still unfinished (1 overdue) — …" |

Tapping a notification opens the relevant page.

### Known quirks

- **Times drift an hour in winter.** Cron schedules are fixed in UTC; you're UTC+3 in summer and UTC+2 in winter, so the slots shift to ~07:00 / ~11:00 / ~18:00. Fix by editing `vercel.json` twice a year, or ignore it.
- **±59 minutes of slop.** Vercel's Hobby plan fires cron jobs anywhere within the scheduled hour, so "08:00" means somewhere in 08:00–08:59.
- **No per-item times.** Everything arrives at the three fixed check-ins; "remind me at 19:30 about this one thing" isn't possible without a paid plan or an external scheduler.

### If reminders stop arriving

1. **Re-enable from the bell.** Subscriptions die on browser reinstall, permission changes, or (on iOS) if the app is evicted or the Home Screen icon is removed. The server prunes dead subscriptions automatically when the push service reports them gone, so the fix is always just to re-subscribe.
2. **Check nothing was actually due** — silence is the correct behaviour for an empty day.
3. **Check the cron ran**: `vercel crons ls` lists the three jobs; the Vercel dashboard's Cron Jobs section shows invocation logs. The route echoes what it sent, so the log line tells you the exact notification text.
4. **Trigger one by hand** to test without waiting:

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     "https://homebase-iota-three.vercel.app/api/cron/notify?slot=morning"
   ```

   Returns `{"slot":"morning","sent":1,...,"title":"...","body":"..."}`, or
   `{"skipped":"nothing due"}`.

### Changing the schedule

Edit the three entries in `vercel.json`, update `SCHEDULE_TO_SLOT` in `src/lib/push/slots.ts` to
match, and redeploy. `npm test` fails loudly if those two drift apart — that guard exists because
the mismatch would otherwise break silently at 5am rather than throwing anywhere visible.

---

## Architecture

Next.js App Router with React Server Components; mutations are Server Actions returning
`{ success: true } | { success: false, error }` rather than throwing. Postgres via Drizzle
(16 tables), Vercel Blob for files, Gemini for OCR.

Two ideas do most of the work:

- **A shared recurrence engine.** One `schedules` table describes "every X" for utilities, bills, chores and maintenance alike. Computing what's *actually* next is pure functions over `YYYY-MM-DD` strings — never `Date` objects, which introduce timezone off-by-one bugs in month arithmetic.
- **Derived status, not stored status.** Overdue/due-today/upcoming, bill status and warranty status are all computed fresh from dates versus today at read time. Nothing needs a background job to stay truthful, and a stored value can never go stale.

**`CLAUDE.md` is the real engineering documentation** — every non-obvious decision, the reasoning
behind it, and the bugs found while verifying each feature. Read it before changing anything;
it exists specifically to stop the same traps being re-hit.

---

## Deployment

Hosted on Vercel, deployed automatically on push to `main`. Postgres is Neon via the Vercel
Marketplace; Blob storage and cron jobs are Vercel-native.

Ship with the `/deploy` skill, which runs lint, type-check, tests and a production build as a
local gate before touching git.

Schema changes: edit `src/db/schema/`, then `npm run db:generate` and `npm run db:migrate`.

---

## Tracking

Work is tracked in [Linear](https://linear.app/madalinprojects/project/homebase-e4a208ccbffb)
under team `MAD`, project `HomeBase`, with the full PRD attached to the project. Linear is the
source of truth for what's built versus planned — this README is a summary.
