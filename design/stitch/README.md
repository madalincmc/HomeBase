# Stitch designs — "Home Management Hub"

Pulled from Google Stitch project `10476742793598613487` (design system: *Serene Home*) on
2026-08-22 via the hosted MCP server. **Design source only** — nothing here is imported by the
app; see the "Google Stitch (design source)" section of `CLAUDE.md`.

All four screens are `deviceType: MOBILE`, authored at a 780px-wide artboard.

| File | Screen title | Screen ID | Artboard h |
|---|---|---|---|
| `screens/dashboard.html` | Home Harmony Dashboard | `b7f60fa97a464d2190e702c09d42f22e` | 1836 |
| `screens/utility-meter-tracker.html` | Utility & Meter Tracker | `d0c844d670494834962b0c8ed020c20d` | 3204 |
| `screens/household-chores.html` | Household Chores | `da4243a9c6a34c8aa1f05cf3bf46a553` | 1768 |
| `screens/maintenance-service-log.html` | Maintenance & Service Log | `1ad848694e804efdac53f49208243c65` | 3676 |

`screenshots/` holds the matching PNG render of each screen, same basename.

## What the HTML is

Standalone, self-contained pages — **not** something to drop into the app as-is:

- **Tailwind via CDN** (`cdn.tailwindcss.com?plugins=forms,container-queries`), with the whole
  Serene Home palette inlined as an on-page `tailwind.config` in every file (identical block in
  all four). That token block is the useful part for porting — it is the same set of Material-3
  style role names (`primary`, `surface-container-*`, `on-surface-variant`, …) that
  `list_projects` returns as `designTheme.namedColors`.
- **Fonts**: Manrope (headlines) + Work Sans (body) from Google Fonts.
- **Icons**: Material Symbols Outlined — the app uses Lucide, so icons need translating, not copying.
- Static markup with placeholder household data ("Good morning, Sarah", Oct 2023 service records).
  `household-chores.html` carries a few lines of inline JS for tab-switch styling only.

## Re-pulling

`list_screens` (bare project id, no `projects/` prefix) returns a `htmlCode.downloadUrl` and a
`screenshot.downloadUrl` per screen; both are plain unauthenticated GETs, so `curl -L` is enough
once you have the listing. Append `=s0` to the `lh3.googleusercontent.com` screenshot URL for the
full-resolution PNG rather than a thumbnail.
