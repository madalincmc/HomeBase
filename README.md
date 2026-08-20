# HomeBase

A household operating system for utilities, bills, chores, maintenance, and other recurring
home responsibilities.

**The desktop tells you what is happening in your home. Mobile helps you take care of it.**

## Status

Early development — Next.js app scaffolded, no features built yet.

## Stack

- [Next.js](https://nextjs.org/) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Lucide](https://lucide.dev/)
- PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- [Vercel](https://vercel.com/) hosting + Vercel Blob for attachments

## MVP features

- **Dashboard** — desktop-first household overview, mobile action-oriented layout
- **Utilities** — electricity, gas, water meter readings and consumption tracking
- **Bills** — recurring and one-off bills, payment status and history
- **Chores** — recurring household chores with scheduling and history
- **Maintenance** — recurring home/appliance maintenance with cost and photo tracking
- **Notifications** — in-app and browser reminders for due and overdue items
- **Activity history** — chronological household timeline
- **Rooms / areas** — organize tasks and maintenance by location

No authentication in the MVP — single household, visible to anyone with the URL.

## Tracking

Work is tracked in [Linear](https://linear.app/madalinprojects/project/homebase-e4a208ccbffb)
under team `MAD`, project `HomeBase`.

## Getting started

```bash
npm install
cp .env.example .env.local   # no variables required yet
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm run build` produces a production
build; `npm run lint` runs ESLint.
