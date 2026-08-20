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

## Tracking

Work is tracked in Linear under team **MAD** (MadalinProjects), project **HomeBase**
(https://linear.app/madalinprojects/project/homebase-e4a208ccbffb). Issue IDs use the `MAD-###`
prefix. The full PRD is attached to the project as a document ("HomeBase — Product Requirements
Document"). Check current issue status in Linear before assuming what's built vs. planned —
this file is a summary, not the source of truth.

## Shipping changes

Use the `deploy` skill (`.claude/skills/deploy/`) to commit, push, open a PR, and merge — it
is invoked manually (`/deploy`), never automatically. Despite the name it does not deploy to
any hosting environment yet, only handles the git/PR workflow. It currently does no local
checks; local checks, a unit test suite, and a CI/CD pipeline are planned additions (see the
skill file for current status).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
