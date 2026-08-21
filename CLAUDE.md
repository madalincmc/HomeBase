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

## Chores

`completeChoreOccurrence` / `skipChoreOccurrence` (`src/lib/chores/actions.ts`) are thin
Server Action wrappers around `completeTaskOccurrence` / `skipTaskOccurrence` — the MAD-90
engine already did the actual work (mark the occurrence, compute and insert the next one in a
transaction), so this feature only adds the `{ success, error? }` shape, `revalidatePath`,
activity logging, and one cleanup step the engine doesn't do: if there's no next occurrence
(one-off chore, or a `"custom"` schedule), `nextDueDate` on the chore gets explicitly cleared to
`null` rather than left showing a stale date. Complete/skip are one-tap buttons, not dialogs —
unlike bills' mark-paid, there's no field that genuinely needs to stay editable per completion.

Unlike utilities/bills, chores allow the **full** recurrence range including `daily`/`weekly` —
those make real sense for a chore ("water plants" daily, "take out trash" weekly) in a way they
don't for a utility reading or a bill.

The **room field only appears once at least one room exists** — same pattern as bills'
utility-association field (MAD-93): conditionally rendered based on data availability rather
than blocking on MAD-97 (rooms/areas) being built first. A fresh household won't show it until
MAD-97 ships and someone creates a room; that's expected, not a bug.

**Editing a chore's due date moves its current pending `task_occurrences` row**, not just the
informational `chores.nextDueDate` column — the task list and dashboard both derive status from
the occurrence, not that column, so an edit that only touched `nextDueDate` would silently not
show up anywhere.

Delete requires confirmation (`DeleteChoreDialog`) since it's destructive and takes the chore's
completion history with it (`task_occurrences` cascade-deletes via the FK from MAD-87).

## Maintenance

`maintenance_items.category` was **added in MAD-95**, not MAD-87 — the original schema missed
it even though the PRD's acceptance criteria for this feature explicitly asks for a category
distinct from room and related appliance. Free text, not an enum: there's no fixed category
list defined anywhere (unlike `utilities.type`), so this doesn't guess at one (e.g. "HVAC",
"Plumbing"). Migration `0002_blushing_masked_marvel.sql`.

Otherwise this feature is structurally identical to chores (MAD-94) — same
`completeTaskOccurrence`/`skipTaskOccurrence` engine reuse, same room-field-only-if-rooms-exist
pattern, same due-date-moves-the-pending-occurrence behavior on edit, same cascade-on-delete —
with two real differences:

- **Complete is a dialog, not a one-tap button** (`CompleteMaintenanceDialog`), because the PRD's
  quick workflow explicitly wants an optional actual cost and notes captured at completion time
  (`task_occurrences.cost`/`.notes`, already supported by the MAD-90 engine's input type) —
  distinct from `maintenanceItems.estimatedCost`, which is the item's planned/estimated cost and
  never gets overwritten by what a specific completion actually cost.
- **`maintenanceItems.lastCompletedAt` is maintained here**, not by the shared engine (chores
  has no equivalent column) — set to `todayDateOnly()` whenever `completeMaintenanceOccurrence`
  succeeds, which is *when the work was done*, not the occurrence's `scheduledFor` (*when it was
  due*) — those can differ for a maintenance item completed late or early.

## Attachments (Vercel Blob)

Blob store `homebase` is provisioned via `vercel blob create-store` (public access — consistent
with the rest of the MVP's no-auth posture) and connected to the `homebase` project, so
`BLOB_READ_WRITE_TOKEN` is already live in Production/Preview/Development — nothing further to
configure. `src/lib/attachments/actions.ts` (`uploadAttachment`/`deleteAttachment`) is the one
shared module every feature's upload/remove UI calls into; don't reimplement Blob calls per
feature.

**Where each entity attaches a file matches the PRD's own workflow language, not a uniform
"add a photo anywhere" pattern**: utilities attach at reading-creation time
(`AddReadingForm`, MAD-92 already had the form), bills at bill-creation *or* edit time
(`CreateBillDialog`/`EditBillDialog` — PRD: "photograph/enter bill"), maintenance at completion
time only (`CompleteMaintenanceDialog` — PRD: "complete → record optional cost/photo"). The
`attachments` table's FK is to the parent **entity** (`meterReadingId`/`billId`/
`maintenanceItemId`), never to a `task_occurrences` row, so a maintenance photo taken "at
completion" is really just attached to the item generally, not to that specific occurrence —
this was a MAD-87 schema decision, not something MAD-96 could change.

**Two-step client orchestration, not one atomic action**: each create/complete action was
extended to return the new row's id on success (`AddMeterReadingResult`, `CreateBillResult`),
and the calling dialog's `handleSubmit` calls `uploadAttachment` as a second step afterward,
reusing the same `FormData` (the entity action ignores its `"file"` field; `uploadAttachment`
only reads that one). If the upload step fails, the entity itself is **not** rolled back — it
already saved. `uploadAttachment` treats "no file chosen" as a normal success no-op, not an
error, since attachments are optional everywhere.

**Found and fixed a real bug during verification, not caught by any local check**:
`deleteMaintenanceItem` cascade-deletes its `attachments` rows via the FK, but a SQL cascade
only removes the *row* — it never calls Blob's `del()`, so the actual file silently leaks
forever. Confirmed this with `vercel blob list` after a cascade delete (the file was still
there). Fixed by fetching and `del()`-ing the item's attachments before the DB delete. **If a
delete action is ever added for utilities or bills, apply the same fix** — right now
`deleteMaintenanceItem` is the only delete path that touches an entity with attachments, so it's
the only one fixed; the single-attachment `deleteAttachment` action was already correct (it
`del()`s before removing the row).

Plain `<img>`, not `next/image`, for thumbnails (`AttachmentList`) — Blob URLs are external and
dimensions are unpredictable; not worth configuring `remotePatterns` for a household app's
photo thumbnails. Validation (JPEG/PNG/WEBP/HEIC/PDF, 10 MB max) is enforced server-side in
`uploadAttachment`, not just via the `<input accept>` hint, which is trivially bypassable.

## Notifications and the reminder center

`src/lib/dashboard/get-due-items.ts` (`getDueItems()`) is a MAD-98 extraction of the
overdue/due-today/upcoming computation that used to live entirely inside `get-dashboard-data.ts`
(MAD-91) — it's the single source of truth for "what's due" across bills, chores, maintenance,
and utilities, now shared by both the dashboard and the notification sync below. The dashboard
just buckets the flat `DueItem[]` it returns; nothing about its own behavior changed.

**No cron/scheduled-task infra exists** (same constraint already noted for bills' display status
and utilities' next-reading-due), so `notifications` rows aren't generated on a schedule — they're
reconciled inline, in `src/lib/notifications/sync-notifications.ts` (`syncNotifications()`),
every time the notification center is opened. It diffs the current `getDueItems()` result against
existing `notifications` rows keyed by `(relatedEntityType, relatedEntityId)`: items no longer due
(paid/completed/skipped/pushed past the 14-day window) get their notification row deleted; new
items get inserted unread; items whose title/due date changed get updated in place.

**`read` is deliberately not reset when a notification's content is updated** — e.g. a chore
sitting in "upcoming" that the user already saw and read, then rolls into "due today" and
"overdue" as days pass with no edit, stays marked read; only an actual content change (the due
date itself was edited) or a brand-new entity entering the due window makes something unread
again. Bucket (overdue/due-today/upcoming) is never stored — like `getBillDisplayStatus()`, it's
recomputed fresh from `dueAt` vs. today every time `getNotifications()` reads the table, so a day
rolling forward alone can't touch a row or its read state. This was a deliberate scope call, not
an oversight: real urgency-escalation re-notification would need tracking each row's previously-
computed bucket, which isn't worth a schema change for MVP — the dashboard's own Needs Attention
section is already the authoritative overdue nag; the notification center is a supplementary
inbox.

`notifications.category` mirrors `DueItem["kind"]` 1:1 (`bill`/`chore`/`maintenance`/`utility`).
The fifth enum value, `"general"`, is reserved for some future non-schedule-derived notification
and is deliberately excluded from every query `syncNotifications()` runs (both the diff and the
stale-delete) — so a hypothetical future `"general"` row can never be created or deleted by this
sync path.

**The bell (`src/components/shell/notification-bell.tsx`) fetches its own data client-side via a
Server Action (`getNotificationCenterData()` in `src/lib/notifications/actions.ts`), not through
server-rendered props.** `AppShell` (which mounts the bell) is rendered by the root layout, which
wraps every route — if the bell were a Server Component doing a direct DB read there, it would
force the *entire app* dynamic (the same class of bug as MAD-91's build-time `getOrCreateHousehold()`
insert, just one layer up), and `/history`, `/more`, and `/settings` would lose the static
optimization they currently have. Fetching via a Server Action sidesteps this entirely: actions
always execute at request time regardless of the calling route's rendering mode. The bell re-fetches
on mount and whenever the popover opens — there's no live-push, so it can go stale between opens on a
long-lived tab; acceptable at MVP's no-realtime-infra scope.

**Found and fixed a real bug during verification**: the bell originally imported
`formatDateOnlyLabel` from the `@/lib/schedule` barrel (`src/lib/schedule/index.ts`). That barrel
also re-exports `task-occurrences.ts`, which imports `@/db` (the `pg` driver) — bundling that into
a Client Component pulls Node-only internals (`fs`, `net`, `tls`, `dns`, `util/types`) into the
browser bundle and fails the production build outright (`next build` caught it immediately; dev
mode didn't). Fixed by importing straight from `@/lib/schedule/format` instead of the barrel.
**Any future Client Component needing something from `@/lib/schedule` should import the specific
module, not the barrel** — every other current usage of the barrel is from Server Components/
Server Actions, where this isn't an issue.

Browser notifications use the plain `Notification` Web API directly — no service worker or push
subscription (that's PWA territory, MAD-101's job, not this one). Permission is only ever
requested from an explicit "Enable" click in the bell popover, never automatically. Firing is
tab-scoped: each fired notification's id is remembered in `localStorage` so remounts/refetches
within the same browser don't re-fire ones already shown; closing the tab and no push
infrastructure means a due reminder won't reach the user while HomeBase isn't open, which is a
known MVP limitation, not a bug.

## Activity history

Activity *logging* already existed before MAD-99 — every completed action (`addMeterReading`,
`markBillPaid`, `completeChoreOccurrence`/`skipChoreOccurrence`, `completeMaintenanceOccurrence`)
already inserted an `activities` row as part of MAD-92 through MAD-95. `skipMaintenanceOccurrence`
deliberately does not (no `maintenance_skipped` value exists in the `activity_type` enum) — MAD-99's
own acceptance criteria only calls for "maintenance completions", not skips, so this is scope, not
a gap. What MAD-99 actually built is the missing other half: reading, filtering, and displaying
that log — `/history` was a placeholder with zero data access before this.

`src/lib/category.ts` introduces one shared `HouseholdCategory` taxonomy
(`utility`/`bill`/`chore`/`maintenance`) with its icon and label maps, extracted because the
dashboard (`DashboardItemRow`'s old local `ICON_BY_KIND`) and this new feature both needed the
exact same mapping — same reasoning as MAD-98's `getDueItems()` extraction. Activity history maps
its 5 `activity_type` enum values onto these 4 categories in `get-activity-history.ts`
(`chore_completed`/`chore_skipped` both collapse to `chore` — users filter at "chore" granularity,
not completed-vs-skipped).

**The category/date filter bar (`HistoryFilters`) is a `next/form` posting a plain GET to
`/history`, not client state (`useState`/`router.push`).** Checked this Next.js version's actual
`<Form>` docs before building it (see the top-of-file warning about not trusting training-data
Next.js knowledge) — `action="/history"` gets client-side-navigated with prefetching, same UX as a
router push, but with zero JS state to write or keep in sync. Radix's `Select` participates in the
native form submission via its `name` prop (already relied on elsewhere, e.g. chore/bill priority
selects), so the category dropdown works exactly like the plain date `<input>`s beside it — no
special-casing needed. `/history`'s own page component reads the result back through its
`searchParams` prop and **re-validates `from`/`to` with `isValidDateOnly` before querying** — unlike
a form POST body, a GET query string is directly bookmarkable/editable by hand, so the same
malformed-date boundary risk MAD-92 found applies here too, just from a different entry point.

`formatActivityTimestamp` (`src/lib/activities/format.ts`) is a new shared formatter — both this
page and the dashboard's Recent Activity list now use it (replacing that component's own inline,
year-less formatter). `activities.occurredAt` is a real `timestamptz`, unlike the `DateOnly`
strings used for schedules/due dates elsewhere, so it's deliberately formatted in the viewer's
*local* timezone (the opposite of `formatDateOnlyLabel`'s deliberate UTC pinning) — see the comment
in `format.ts` for why the two dates behave differently on purpose.

No pagination — `getActivityHistory` caps at 100 rows, same fixed-limit approach as the
notification center. A full paginated/searchable history is Phase 2 analytics territory per the
PRD's phase breakdown, not this issue's scope.

## Global quick actions

The mobile-only FAB (`QuickActionButton`, `md:hidden` — deliberately not duplicated on desktop,
per the PRD's "desktop tells you what's happening, mobile helps you take care of it" split) opens
a menu of the four creation flows, each backed by the household's **real** creation dialog —
`AddReadingDialog` (new, wraps `AddReadingForm`), `CreateBillDialog`, `CreateChoreDialog`,
`CreateMaintenanceDialog` — not a separate, parallel implementation. This satisfies "add a photo/
document where applicable" automatically, since those dialogs already have the MAD-96 attachment
field built in.

**Every one of those three page-level dialogs gained optional `open`/`onOpenChange`/`trigger`
props**, defaulting to their original uncontrolled, self-triggering behavior so every existing
page usage (`/bills`, `/tasks`, `/maintenance`) is unaffected. The quick-actions menu renders
controlled instances (`trigger={false}`) instead of duplicating their form logic. All four
sub-dialogs are **always mounted** (each `open={active === "x"}`), not conditionally rendered per
selection — mounting/unmounting on every menu pick would cut off Radix's own close animation.

Meter readings are the one flow needing a parent (a specific utility) that the other three don't,
so `AddReadingDialog` adds a picker sub-step: skipped automatically when exactly one utility
exists, shown when there's more than one, and replaced with a "no utilities yet" message when
there are none. Resetting that picker step on reopen uses the React-docs "adjust state during
render" pattern (comparing current vs. previous `open` and calling `setState` inline, not in a
`useEffect`) — the same class of fix the notification bell needed for `set-state-in-effect`, just
solved differently here since this is a reopen-triggered reset rather than a mount-triggered fetch.
`AddReadingForm` gained an optional `onSuccess` callback for this — the utility detail page's
inline usage still just resets the form and stays put, but the dialog needs to close itself. This
also fixed a latent inconsistency: the inline form used to reset itself even when the attachment
upload step failed (discarding the values right when there was an error to review); it now matches
every other create dialog's behavior of staying open with the error visible until the upload step
actually succeeds.

**Found and fixed a real, generally-applicable bug while verifying this in-browser**: `DialogContent`
had no height cap or internal scroll, so on a short viewport a long form's submit button could
render fully off-screen with no way to scroll it into view — reproduced with the bill quick-action
form specifically, but it's a `src/components/ui/dialog.tsx` primitive fix, not scoped to quick
actions, since any long dialog anywhere in the app could hit it on a small enough screen. Fixed by
adding `max-h-[85vh] overflow-y-auto` to the content wrapper.

## Rooms and areas

Rooms management lives inside `/settings`, not a new top-level nav item — the Settings page's own
MAD-89 placeholder copy already said "household name, default rooms, and notification preferences
will show up here," so this was the intended home, not a new decision. `getHouseholdRooms()` was
duplicated identically in `chores/get-chores.ts` and `maintenance/get-maintenance.ts` since MAD-94/
95; consolidated into `src/lib/rooms/get-rooms.ts`, which both now import instead.

**Default rooms (Kitchen/Bathroom/Living Room/Bedroom/Garage/Garden) are one-click suggestions, not
auto-seeded at household creation.** There's no onboarding flow (MAD-102), so silently creating 6
rooms nobody asked for the moment `getOrCreateHousehold()` first runs would mean e.g. an apartment
household gets a "Garden" it never wanted. `AddRoomForm` shows each default as a quick-add chip,
filtered against existing room names (case-insensitively) so it disappears once added — this list
naturally shrinks to nothing once all 6 exist, and a deleted default reappears as a suggestion since
filtering is by current room list, not by "was this ever added."

**Deleting a room needs no application-level cleanup**: `chores.roomId` and `maintenanceItems.roomId`
are `ON DELETE SET NULL` (MAD-87 schema foresight) — the DB itself unassigns the room from anything
referencing it. `deleteRoom` is a plain delete; `DeleteRoomDialog`'s confirmation copy just makes
that consequence visible up front ("will be unassigned, not deleted") rather than leaving the user
to guess whether it's safe, which is what "removed safely" in the acceptance criteria actually
needed — the safety itself was already there.

**Room filtering on `/tasks` and `/maintenance`** reuses MAD-99's `next/form` GET-navigation pattern
(`RoomFilter`, in `src/components/rooms/` despite rendering on those other pages, since it's
specifically about filtering *by* room) — a real navigation with search params, no client state.
Unlike History's date filters, an invalid/stale `?room=` value needs no `isValidDateOnly`-style
guarding: it's passed straight into `eq(chores.roomId, roomId)`, and a non-existent id just matches
zero rows — a safe no-op, not a data-integrity risk, so the extra validation step isn't needed here.
The filter UI is hidden entirely when a household has zero rooms, same "conditionally rendered by
data availability" pattern the room field itself has used in chore/maintenance forms since MAD-94.

## Bill OCR (Phase 2)

**AI provider is Google Gemini via `@ai-sdk/google`, not Vercel's AI Gateway.** Gateway was tried
first and technically worked (OIDC auth succeeded), but Vercel requires a credit card on file
before it'll actually serve any request, gated behind `customer_verification_required` — a real
blocker for a personal project, not a code problem. Gemini's free tier needs no card at signup and
its quota (~1,500 requests/day) is far beyond a household's bill-scanning volume. The tradeoff:
free-tier Gemini prompts may be used by Google to improve their models — a conscious, explicit
choice for this use case, not an oversight. If this ever needs to move off the free tier or to a
different provider, `google("gemini-flash-latest")` in `src/lib/bills/extract-bill.ts` is the one
call site to change.

**Extraction reuses the existing `CreateBillDialog` rather than a separate flow.** The attachment
field moved to the top of the dialog with a new "Scan with AI" button beside it; `AttachmentUploadField`
gained an optional `inputRef` so the dialog can read the already-selected file on demand instead of
needing a second, duplicate file picker just for scanning. `BillFormFields` already accepted a
`defaultValues` prop (added back in MAD-93 for the edit dialog) — extraction just populates it after
the fact. Since `defaultValue` only applies at mount, not on prop changes, the fields are forced to
re-mount via a `key` swap when extraction completes so the new values actually show up on an
already-open dialog.

**Every field the model returns is a required, non-nullable string, never `z.nullable()`/`z.union()`
in the Zod schema.** `@ai-sdk/google`'s docs flag that Google's structured-output support is a
subset of OpenAPI 3.0 that chokes on those Zod features. The model is instructed to return `""` for
anything it can't find, and `""` is converted to `null` after the response comes back — same
practical effect as a nullable schema, without hitting the limitation.

**Confidence handling**: the model self-reports one overall `high`/`medium`/`low` confidence (not
per-field) rather than a confidence score per field — simpler to reason about, and per-field
nullability already carries most of the same information in practice (a field the model wasn't
sure about is generally exactly the field it left empty). `low` confidence renders in
`text-destructive` as a visible nudge to double-check; `medium`/`high` stay muted. This is the
"confidence handling" acceptance criterion — the actual safety net is that every field stays
editable regardless of confidence, since the user reviewing and confirming before saving was always
the real requirement, not the confidence label itself.

**Manual fallback is structural, not a special code path**: extraction only ever *pre-fills* an
already-fully-functional manual form, so a failed scan (bad file, model error, low-quality photo)
just means the fields stay empty — the same "Add bill" flow that existed before this feature works
completely unaffected regardless of whether scanning is used, attempted, or fails. Validation
errors (no file chosen, wrong type, too large) surface their real message; anything past that point
(model/network failures) shows one generic message and logs the real cause server-side, rather than
leaking AI SDK internals to the form.

**Original document attachment is unaffected by any of this** — extraction reads the file's raw
bytes directly in the Server Action and never touches Blob storage; the actual attachment upload
still happens exactly as it did before (MAD-96's `uploadAttachment`, after the bill is created),
regardless of whether extraction ran, succeeded, or was never attempted.

## Meter-reading OCR (Phase 2)

Same Gemini/`@ai-sdk/google` approach as bill extraction (MAD-103) — one Zod field (`value`), same
non-nullable-string-with-`""`-fallback pattern, same one-shot `high`/`medium`/`low` confidence.
`src/lib/utilities/extract-reading.ts` mirrors `extract-bill.ts`'s shape closely on purpose; if a
third extraction use case shows up, that's the point to factor out the shared parts (file
validation, the try/catch-with-generic-fallback shape), not before — two call sites doesn't
justify it yet.

**The scan trigger lives inside `AddReadingForm` itself, not a wrapping dialog** — unlike bills,
which have one dedicated `CreateBillDialog`, `AddReadingForm` is already the single shared
component used both inline on the utility detail page and inside `AddReadingDialog` (MAD-100's
quick-action wrapper), so adding "Scan with AI" there once covers both call sites automatically.

**The reading field is updated via a direct ref, not a `key`-remount.** Bill extraction
(MAD-103) forces `BillFormFields` to re-mount with new `defaultValues` because it's populating
many fields at once and that component already took a `defaultValues` prop for the edit dialog's
sake. Meter reading extraction has exactly one field to populate, so `valueInputRef.current.value
= result.data.value` is simpler and doesn't need the extra machinery — same end result (an
uncontrolled input showing the new value), less code for a one-field case.

**Verified extraction resilience against a transient failure, not just the happy path**: the first
scan attempt during testing hit a real `AI_APICallError` ("high demand") from Gemini's API — this
surfaced to the user as the intended generic manual-fallback message while the actual `AI_RetryError`
was logged server-side, then a retry succeeded and read the test meter's value correctly. Confirms
the try/catch boundary around the model call (not just around file validation) is doing its job,
not merely handling errors that never happen in practice.

## Utility consumption analytics (Phase 2)

Chart primitives are shadcn's `chart` component (`npx shadcn@latest add chart`, `src/components/
ui/chart.tsx`) on top of Recharts 3.8 — `ChartContainer`/`ChartTooltip`/`ChartTooltipContent` with
CSS-variable-based theming, not a hand-rolled SVG chart or a separate charting library.

`getConsumptionHistory()` (`src/lib/utilities/get-consumption-history.ts`) computes two views from
the same ordered reading list: a per-reading `history` (each entry's delta from the previous
reading) and a `monthly` bucketing that sums every delta whose *later* reading falls in a given
calendar month — a billing period spanning a month boundary is attributed to the month it ended
in, matching how a utility bill actually lands. A gap of more than `GAP_THRESHOLD_DAYS` (45) since
the previous reading marks that entry `gap: true` in both views; the chart renders gapped bars in
a washed-out tone with a caption explaining consumption for that period may be incomplete, rather
than silently plotting a number that conflates two-plus months of usage as one delta. The
threshold is a plain constant, not configurable — nothing in the PRD calls for tuning it per
household.

**Two real Recharts bugs found and fixed during verification, not caught by type-checking:**
- A custom `shape` function on `<Bar>` (used to color gap bars differently via `GapAwareBar` in
  `consumption-chart.tsx`) always received `height: 0`, rendering invisible bars regardless of the
  real data — confirmed via a temporary `console.log` inside the shape function showing `height: 0`
  even though `x`/`width`/the data value were all correct. Recharts' default bar-growth animation's
  initial (zero) keyframe doesn't get superseded when a custom `shape` is used. Fixed with
  `isAnimationActive={false}` on `<Bar>`. **Any future custom-`shape` bar/area chart in this repo
  needs the same flag**, or it will silently render blank.
- The gap/normal color assignment was backwards from its own caption on first pass (gap bars used
  a darker tone than normal bars, contradicting "gapped bars render lighter") — the Nova theme's
  `--color-chart-*` tokens run light-to-dark by index, so the lightest token (`chart-1`) had to be
  the "faded/de-emphasized" one, not the darkest. Caught by comparing the rendered screenshot
  against the caption text, not by any automated check.

`UtilitySwitcher` (`src/components/utilities/utility-switcher.tsx`) renders nothing when the
household has fewer than two utilities — a one-option switcher has no purpose. Backed by
`getUtilitiesSummary()` (`src/lib/utilities/get-utilities.ts`), a minimal `{id, type, provider}`
query kept deliberately separate from `getUtilitiesWithLatestReadings()` (used elsewhere) so the
switcher doesn't pay for reading-aggregation it never displays.

## Household cost analytics (Phase 2)

**`bills.category` is a new nullable free-text column** (migration `0003_kind_jack_murdock.sql`),
added specifically for this feature — same reasoning as `maintenanceItems.category` (MAD-95):
no fixed spending-category taxonomy exists anywhere in the PRD, so this stays flexible rather
than guessing at one (e.g. "Utilities", "Rent"). It's independent of a bill's `utilityId` link —
a utility-linked bill and a category are separate concepts here, matching how the field is
presented in the form (an optional text input next to Provider, not derived from the linked
utility's type).

`getCostAnalytics()` (`src/lib/bills/get-cost-analytics.ts`) aggregates **paid bills only** —
"spend" means money that actually left the household, not what's upcoming — bucketed by month
and by year in the same pass, each bucket further broken down by category (`bill.category ??
"Uncategorized"`, satisfying "handle bills without categories cleanly"). A period's `changePercent`
compares its total to the immediately preceding period (previous month, or previous year), staying
`null` for the earliest period on record since there's nothing to compare against — this is the
"simple trend comparison" the acceptance criteria asked for, deliberately not a multi-period
rolling average or anything more elaborate. Aggregation happens in JS after one query, not SQL
`GROUP BY` — same style choice as `getConsumptionHistory()` (MAD-105): a personal household's
bill history is a tiny dataset, and mixing aggregation styles across features isn't worth it for
the performance this app will ever actually need.

**No currency conversion — this is a deliberate MVP simplification, not an oversight.**
`bills.currency` is free text the user types per bill; `getCostAnalytics()` sums raw amounts and
returns the single most-common currency across paid bills purely for display. A household that
genuinely mixes currencies would get a nonsensical total, but HomeBase is explicitly a
single-household personal app with no stated multi-currency requirement anywhere in the PRD —
same class of trade-off as consumption analytics' undetected meter resets.

`CostAnalytics` (`src/components/bills/cost-analytics.tsx`) mirrors `ConsumptionChart`'s shape
(MAD-105) on purpose — a Monthly/Yearly toggle instead of Monthly/History, a shadcn/Recharts bar
chart of totals per period, an empty state when there's no paid-bill history yet. The category
breakdown underneath is a plain CSS-width proportional bar list, not a second Recharts chart —
deliberately avoids the custom-`shape`/`isAnimationActive` gotcha MAD-105 already hit once, since
a plain list needs no custom shape function to color bars by category. The trend indicator
(`+8% vs previous month`) uses `text-destructive` for an increase and muted styling for a
decrease/flat — the same "worth a second look" visual convention the OCR features (MAD-103/104)
established for low-confidence extractions, reused here rather than introducing a new red/green
positive-negative convention.

Verified against seeded live data with a known-by-hand expected result: three paid bills in June
2026 across two categories plus one uncategorized (total 1,250), two in July 2026 (total 1,150,
correctly showing "-8% vs previous month"), and one in June 2025 (200) to exercise the yearly
view's trend ("+1100% vs previous year" between 2025's 200 and 2026's 2,400). Also verified
end-to-end through the real Add/Mark-paid/Edit UI flow (not just seeded rows) — created a bill
with a category through `CreateBillDialog`, marked it paid, and confirmed the new category
appeared correctly in both the paid-bills list and the category breakdown before cleanup.

## Household document vault (Phase 2)

**A new standalone `documents` table, not a reuse of `attachments`.** `attachments`
(MAD-96) always requires exactly one parent (a meter reading, bill, or maintenance item — DB-
enforced by a CHECK constraint) because it represents a photo taken *during* one specific action.
A vault document is the opposite: it can stand completely alone (a home insurance policy PDF with
no related entity at all), so a required-parent table doesn't fit. What "existing attachment
storage is reused" (the acceptance criteria's literal words) actually means here: the Vercel Blob
upload/delete calls and file-validation rules were extracted out of `attachments/actions.ts` into
`src/lib/attachments/blob.ts` (`uploadFile`/`deleteFile`/`validateFile`), and both `attachments`
actions and the new `documents` actions now call the same shared helper — one real code path for
every file upload in the app, not two parallel Blob integrations.

**Two different FK strategies on the same table, deliberately.** `documents.roomId` ("area") is a
real nullable FK with `ON DELETE SET NULL` — the same pattern chores/maintenanceItems already use
for rooms, appropriate because rooms are a known, fixed entity type. `relatedEntityType` (text) +
`relatedEntityId` (uuid) ("item") is instead the *unenforced* pointer pattern from
notifications/activities, not a real FK — because the linkable set isn't fixed: it's bills and
maintenance items today, but the acceptance criteria explicitly calls out "future inventory
records" (MAD-108, not built yet). A real FK would need a new nullable column and a migration the
day MAD-108 ships; the unenforced pattern needs neither — same reasoning CLAUDE.md already
documents for notifications/activities, reapplied here for the first time on a *content* table
rather than a log table. One consequence carried over from that precedent: deleting a linked bill
or maintenance item does **not** cascade-delete or unlink the document — a warranty document
shouldn't vanish just because the bill that originally purchased the item was removed. The UI
resolves a stale link to no title rather than crashing (`getDocuments()`'s second-pass lookup by
id, `Map.get(id) ?? null`).

**`documents.category` is free text**, the same no-fixed-taxonomy precedent as `bills.category`
(MAD-106) and `maintenanceItems.category` (MAD-95) — no fixed document-category list exists in the
PRD (e.g. "Warranty", "Manual", "Receipt", "Contract").

**"Link to" is one combined `<Select>`, not two dependent dropdowns.** The create dialog's link
field encodes both the type and the id into a single option value (`"bill:<uuid>"` /
`"maintenance_item:<uuid>"`), grouped into `SelectGroup`/`SelectLabel` sections per type, parsed
apart server-side in `readLink()`. A two-step "pick a type, then pick an item" UI (the pattern
`AddReadingDialog` used for its utility picker, MAD-100) would need extra client state for a
dependent second field; a household's combined bill + maintenance-item count is small enough that
one flat grouped list is simpler and needs none.

**Search matches title, category, notes, and the original filename** (`getDocuments()`'s `ilike`
across all four) — "search by title and metadata" from the acceptance criteria, where "metadata"
is interpreted as the notes field plus whatever came from the uploaded file itself, not a
separate structured-metadata system. The category and area filter dropdowns are conditionally
rendered only when at least one document has that data (`getDocumentCategories()` returning
distinct values, `getHouseholdRooms()`), same "hidden until there's data" convention used
everywhere else in the app (chore/maintenance room fields, the `/tasks` and `/maintenance` room
filters). Combined into one `next/form` GET, same MAD-99/MAD-97 pattern as `HistoryFilters`/
`RoomFilter` — a real navigation with search params, no client state.

**A file is required, unlike every other attachment flow in the app.** `AttachmentUploadField`
gained an optional `required` prop (default `false`, so every existing call site is unaffected)
because a vault document's entire purpose is the file — unlike a bill or meter reading, where the
photo is optional supporting evidence for something that already has other required fields.

**No activity-history integration.** Every other create/complete action in the app
(readings, bill payments, chore/maintenance completions) logs an `activities` row — a document
upload deliberately does not. The closer precedent is rooms (MAD-97), which also doesn't log
activity: both are administrative record-keeping, not a household task being done, and the
acceptance criteria doesn't ask for it. Revisit only if a future issue explicitly asks for
documents to appear in the History timeline.

**New top-level nav item, unlike Rooms.** Rooms (MAD-97) lives inside Settings because it's
configuration for other features, not a content area of its own. The document vault is exactly
what its own name says — a real place to browse/search — so it gets a normal `desktopNavItems`
entry and, on mobile, a `/more` entry alongside Maintenance/History/Settings, matching how every
other genuine content section is reachable.

## Home inventory (Phase 3)

`inventory_items` is structurally closest to `maintenanceItems` (room association, free-text
`category`) but has **no schedule/occurrence machinery at all** — it's a static asset record
(name, brand, model, serial number, purchase date, price), not a recurring template, so none of
the `schedules`/`task_occurrences` engine applies here.

**`attachments` gained a fourth parent column** (`inventoryItemId`), extending the existing
exactly-one-parent CHECK constraint from three cases to four (migration `0005_woozy_scalphunter.sql`
drops and recreates the constraint) — the most direct way to satisfy "attach photos, receipts and
manuals" using the app's established real-FK attachment pattern, rather than routing everything
through the document vault. **Attachment timing follows bills' pattern, not maintenance's**:
inventory items attach a file at create *or* edit time (`CreateInventoryItemDialog`/
`EditInventoryItemDialog`, both using the same two-step create-then-upload orchestration bills and
documents already use), never at a "completion" event — there isn't one for a static record, unlike
a maintenance item's schedule-driven occurrences. Multiple files (a photo *and* a receipt *and* a
manual) accumulate the same way bills do: one optional attachment per create/edit round-trip,
building up a list over several edits, using the same `AttachmentList`/`AttachmentUploadField`
components as everywhere else. `deleteInventoryItem` fetches and `deleteFile()`s the item's
attachments before the DB delete — the same Blob-leak fix MAD-96 needed for
`deleteMaintenanceItem`, applied here from day one instead of found as a bug later.

**Closes the loop MAD-107 (document vault) explicitly left open.** That feature's schema comment
called out "future inventory records" as the reason `documents.relatedEntityType`/
`relatedEntityId` uses the unenforced pointer pattern instead of a real FK — now that
`inventory_items` exists, `"inventory_item"` was added to `LINKABLE_TYPES` in
`src/lib/documents/actions.ts`, plus the matching resolver in `getDocuments()`'s second-pass title
lookup and a third `getLinkableEntities()` query — exactly the "no migration needed" extension that
comment predicted. This means an inventory item can be documented two different ways depending on
intent: a quick photo attached directly to the item (the `attachments` path above), or a fuller
vault document (with its own category, search, and notes) optionally linked back to the item — both
coexist, matching how maintenance items already work both ways.

**New top-level nav item**, same reasoning as Documents (MAD-107) over Rooms (MAD-97): Inventory is
a genuine browsable/searchable content area, not configuration, so it gets a normal
`desktopNavItems` entry and a `/more` entry on mobile (placed between Maintenance and Documents in
both).

Search (`getInventoryItems()`) matches name, category, brand, model, or serial number via `ilike`;
category and area filters are conditionally rendered only when at least one item has that data,
same convention as every other filter bar in the app. No detail route — like bills/chores/
maintenance (and unlike utilities, which needed one for reading history), an inventory item's full
CRUD lives directly on `/inventory` via Edit/Delete dialogs, since there's no sub-resource (like
readings) that would justify a dedicated page.

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
