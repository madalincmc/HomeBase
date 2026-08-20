# CLAUDE.md

Guidance for Claude Code (and any future contributor) working in this repository.

## What HomeBase is

HomeBase is a web-based household management dashboard — a "household operating system" for
utilities, bills, chores, maintenance, and other recurring home responsibilities.

**Product principle:** The desktop tells you what is happening in your home. Mobile helps you
take care of it.

Full requirements live in Linear, not in this repo. See "Tracking" below before assuming scope.

## Tech stack (MVP)

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui + Lucide icons
- PostgreSQL + Drizzle ORM
- Vercel hosting, Vercel Blob for photo/document attachments
- **No authentication in MVP** — single household, visible to anyone with the URL. The schema
  still models a `Household` entity so multi-household + auth can be added later without a
  redesign.

## MVP scope

Dashboard, Utilities (meter readings + consumption calc), Bills (recurring/one-off, payment
history), Chores, Maintenance, a shared recurrence engine (daily/weekly/monthly/every-X-months/
yearly/custom, preserving history), notifications (in-app + browser), photo/document
attachments, activity history, and rooms/areas.

**Explicitly out of scope for MVP:** auth/accounts, multiple households, native mobile apps,
utility provider integrations, automatic bill retrieval, AI assistant, OCR, advanced analytics,
shopping list, inventory/warranty tracking, contractor management. These are staged into later
phases — see Linear.

## UI foundation

shadcn/ui is set up with the Radix base (`radix-ui` package) and the "Nova" style/preset —
**not** the newer experimental Base UI preset (`shadcn init`'s default when run with `-d`),
which had a broken registry item (`select` importing a shadcn.com-demo-only path) at the time
this was set up. Icon library is Lucide (`lucide-react`); fonts are Geist Sans/Mono via
`next/font`. Component tokens (color, radius) live in `src/app/globals.css`; add new primitives
with `npx shadcn@latest add <name>`.

Available primitives: `button`, `card`, `badge`, `dialog`, `navigation-menu`, `input`,
`textarea`, `label`, `separator`. Forms use `field` (`Field`, `FieldLabel`, `FieldDescription`,
`FieldError`, `FieldGroup`, etc.) — this shadcn version replaced the old react-hook-form-bound
`Form` component with these framework-agnostic primitives; wire them to `react-hook-form`
yourself if/when a form needs validation.

**Breakpoint convention:** mobile layout below `md` (768px, Tailwind's default), desktop layout
at `md` and above — matches the PRD's explicit desktop-dashboard vs. mobile-action-layout split.

## Database

Postgres is provisioned via the Vercel Marketplace (Neon), attached to the linked Vercel
project `homebase` (team `madalincmcs-projects`) — not a manually-managed instance. Get local
env vars with `vercel env pull .env.local` rather than filling in `.env.example` by hand.

Neon gives two connection strings: **pooled** (`DATABASE_URL`) for the app's runtime queries,
and **direct/unpooled** (`DATABASE_URL_UNPOOLED`) for schema migrations — the pooled connection
(PgBouncer, transaction mode) doesn't support the session-level operations `drizzle-kit` uses.
`drizzle.config.ts` is already wired to the unpooled URL; don't point it at the pooled one.

Driver is `node-postgres` (`pg`) via `drizzle-orm/node-postgres`, per Vercel's Fluid Compute
recommendation — not `@neondatabase/serverless`. `src/db/index.ts` wraps pool creation with
`attachDatabasePool` from `@vercel/functions` so idle connections drain properly on scale-down,
and reuses the pool across dev-mode HMR reloads via a `global` singleton.

Schema lives in `src/db/schema/` (one file per domain, re-exported from `index.ts`), 12 tables:
`households`, `rooms`, `schedules`, `utilities`, `meter_readings`, `bills`, `chores`,
`maintenance_items`, `task_occurrences`, `attachments`, `notifications`, `activities`. Migration
workflow: `npm run db:generate` (writes SQL to `drizzle/`) then `npm run db:migrate` (applies
it) — both scripts load `.env.local` via `dotenv-cli` since `drizzle-kit` doesn't auto-load it
the way Next.js does.

**Recurrence:** `schedules` is one shared recurrence-rule table reused by `utilities` (reading
reminders), `bills`, `chores`, and `maintenance_items`, each via a nullable `scheduleId`. It only
stores the rule (frequency/interval/anchor date) — computing what's actually due next lives in
`src/lib/schedule/`, not the schema.

`computeNextOccurrence` (`compute-next-occurrence.ts`) is a pure function operating on plain
`YYYY-MM-DD` strings, never `Date` objects for the calendar math — Drizzle returns Postgres
`date` columns as strings by default (only `timestamp` columns default to `Date`), and doing
month/year arithmetic through `new Date(dateString)` risks off-by-one-day bugs across
timezones. All arithmetic stays in UTC internally and clamps the day when a month is shorter
(Jan 31 + 1 month → Feb 28/29, not Mar 3) or a target year isn't a leap year. `"custom"`
frequency returns `null` — there's no formula, a person picks the next date by hand. Anchors on
the *scheduled* date, not the completion date, so a bill due the 15th stays due the 15th
regardless of when it was actually paid.

`completeTaskOccurrence` / `skipTaskOccurrence` (`task-occurrences.ts`) are the only pieces that
actually touch `task_occurrences` end to end: in one transaction, mark the occurrence
completed/skipped, look up its parent chore/maintenance item's schedule, compute the next date,
insert the next pending occurrence, and bump the parent's `nextDueDate`. A one-off task (no
`scheduleId`) or a `"custom"` schedule just completes with no next occurrence created — that's
expected, not a bug. This only covers chores/maintenance; bills and meter-reading reminders
reuse `computeNextOccurrence` too, but generating their next row is each feature's own job
(MAD-92/MAD-93), not this engine's.

`compute-next-occurrence.test.ts` has permanent unit tests (Node's built-in `node:test`, run via
`npm test`) — the first tests in the repo. Chose the built-in runner over installing
vitest/jest since this module is pure/deterministic and didn't need more; revisit if a real
framework becomes worth it once there's more to test.

**History:** `meter_readings` and `bills` preserve history simply by being append-only — a new
row per reading or billing period, never overwritten. `chores` and `maintenance_items` are
recurring *templates*, not instances, so their completion history lives in `task_occurrences`
instead (one row per due/completed/skipped occurrence).

**Two FK patterns for "belongs to one of several parents":** `task_occurrences`
(chore/maintenance) and `attachments` (meter_reading/bill/maintenance_item) use **real nullable
FK columns plus a CHECK constraint** enforcing exactly one is set — gives cascade delete and DB-
enforced integrity. `notifications` and `activities` instead use an **unenforced**
`relatedEntityType` (text) + `relatedEntityId` (uuid) pair with no FK at all, deliberately: they
can point at any of several entity types without one column per type, and a log entry shouldn't
vanish just because its source row was later deleted. Don't "fix" the second pattern into FKs —
it's intentional, not an oversight.

## Dashboard

`getOrCreateHousehold()` (`src/lib/household.ts`) is how every page gets "the" household —
there's no onboarding flow yet (MAD-102), so the first request that needs a household creates
one named "My Household" if none exists. Reuse this rather than querying `households` directly.

`src/app/page.tsx` exports `export const dynamic = "force-dynamic"` — **don't remove this.**
Without it, Next statically prerenders `/` at build time, which baked in a stale "today" and,
worse, ran `getOrCreateHousehold()`'s insert as a build-time side effect (caught this the hard
way: a real household row got created just from running `next build` locally). Any future page
that reads live household data and doesn't already opt out of static rendering some other way
needs the same treatment.

`get-dashboard-data.ts` buckets bills (unpaid, by `dueDate`) and chore/maintenance
`task_occurrences` (`status: "pending"`, by `scheduledFor`) into overdue/dueToday/upcoming by
comparing against `todayDateOnly()` — not the stored `bills.status` enum, since nothing updates
that automatically yet. Utilities have no stored "next reading due" column (unlike
chores/maintenance), so their due date is computed on the fly with `computeNextOccurrence`,
anchored on the most recent actual `meter_readings` row (or the schedule's `anchorDate` if there
isn't one yet).

Dashboard item cards link to their section's list page (`/bills`, `/tasks`, `/maintenance`) or,
for utilities, the specific `/utilities/[id]` detail page — bills/chores/maintenance don't have
per-item detail routes yet (the PRD doesn't call for one in MVP scope), utilities does because
MAD-92 needed one for reading history anyway.

Mobile vs. desktop section order (PRD: desktop is Today/Needs Attention/Upcoming/Overview/
Recent Activity; mobile prioritizes overdue first) is done with Tailwind `order-*` per
breakpoint on one shared DOM tree, not two separate layouts — see the comment in `page.tsx`.
Household Overview and Recent Activity are `hidden md:block` (mobile doesn't get them per the
PRD). Verified the reordering classes are correct via DOM inspection, same caveat as MAD-89: this
sandbox can't actually render a narrow viewport to screenshot it.

## Utilities and meter readings

Establishes the pattern later CRUD features (bills, chores, maintenance) should follow —
Server Actions (`"use server"`) returning `{ success: true } | { success: false; error }`
rather than throwing, called directly from a client component via `useTransition` (not
`useActionState` + a `useEffect` watching for success): closing a dialog or resetting a form on
success needs to happen as a state update, and doing that inside a `useEffect` trips the
`react-hooks/set-state-in-effect` lint rule. Calling the action directly inside
`startTransition(async () => { ... })` gives the same pending/result handling from a genuine
event callback instead.

**Validate date strings at the server boundary, not just via the native date input.** Found
this the hard way: browser-automation testing (typing "08/15/2026" including literal slashes
into an `<input type="date">`) produced a mis-entered value that reached the server as
"152026-08-07" — a 6-digit year — and the action inserted it into Postgres with zero
validation, since it only checked the field was non-empty. `isValidDateOnly()`
(`src/lib/schedule/is-valid-date-only.ts`) now guards every date string an action receives
before it touches the database; use it (via the `readRequiredDate` helper pattern in
`utilities/actions.ts`) for any future date input, not just `readRequiredString`.

Reading reminders are deliberately restricted to `"monthly"` or `"custom"` in this feature's
UI (`READING_SCHEDULE_FREQUENCIES` in `actions.ts`) even though `schedules.frequency` supports
more — the other frequencies (daily/weekly/yearly/every_x_months) are for chores/maintenance,
per MAD-92's acceptance criteria.

Consumption (`src/lib/utilities/consumption.ts`) is just the delta between a reading and the
next-older one for that utility — returns `null` (displayed as "—") when there's no prior
reading or the delta is negative (meter reset/rollover isn't detected or corrected in MVP).

Photo attachments aren't wired up — the reading form shows "Photo attachments aren't available
yet" instead of a non-functional file input. Real upload support is MAD-96 (Vercel Blob).

## Bills and payment tracking

`bills.status` is only ever written as `"upcoming"` (creation) or `"paid"` (mark paid) — the
schema's `"due"`/`"overdue"` enum values exist but nothing writes them, same reasoning as
utilities' reading reminders: they're time-derived and would go stale the moment a day passes
with no write. `getBillDisplayStatus()` (`src/lib/bills/status.ts`) computes the displayed
status from `dueDate` vs. today instead, matching how the dashboard (MAD-91) already treats
bills. Don't try to "fix" this by writing due/overdue into the column — the display logic
already handles it correctly, and a background job to keep a stored value in sync doesn't exist
(no cron/scheduled-task infra yet).

**Recurring bills generate their next instance when the current one is marked paid**, not on a
schedule/cron — `markBillPaid` (`src/lib/bills/actions.ts`) computes the next due date via
`computeNextOccurrence`, anchored on the bill that was just paid's `dueDate` (not the payment
date), and inserts a new `bills` row if the schedule isn't `"custom"`. This mirrors
`completeTaskOccurrence` (MAD-90) for chores/maintenance, adapted because bills don't have an
occurrences table — each billing period is just its own row (see MAD-87's schema notes).

Recurrence for bills is restricted to `monthly` / `every_x_months` / `yearly` / `custom` (no
daily/weekly — doesn't make sense for a bill), and unlike utilities' reading reminders, there's
no separate "anchor date" field: the bill's own `dueDate` **is** the anchor, since a bill
naturally has one already.

Mark-paid is a small dialog (`MarkPaidDialog`), not a single button, so the payment date is
still genuinely editable — but it's pre-filled to today, so the common case is still just two
taps. This is the "mobile-friendly mark-paid flow" the acceptance criteria asked for.

## Tracking

Work is tracked in Linear under team **MAD** (MadalinProjects), project **HomeBase**
(https://linear.app/madalinprojects/project/homebase-e4a208ccbffb). Issue IDs use the `MAD-###`
prefix. The full PRD is attached to the project as a document ("HomeBase — Product Requirements
Document"). Check current issue status in Linear before assuming what's built vs. planned —
this file is a summary, not the source of truth.

## Shipping changes

Use the `deploy` skill (`.claude/skills/deploy/`) to commit, push, open a PR, and merge — it
is invoked manually (`/deploy`), never automatically. Despite the name it does not deploy to
any hosting environment yet, only handles the git/PR workflow. It runs lint, type-check, tests,
and a production build as a local gate before anything ships — a failure stops it before any
git state changes. A CI/CD pipeline (the same checks running on GitHub) is still a planned
addition (see the skill file for current status).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
