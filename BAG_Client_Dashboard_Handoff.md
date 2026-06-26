# BAG Client Dashboard — Handoff & Pattern Reference

**Author:** Ed Bedrijo (Brickell Ads Group)
**Last updated:** 2026-06-25
**Purpose:** Reference doc for spinning up a new client dashboard or input form using the same stack and conventions as the STR Law Guys dashboard. Use this when creating CLAUDE.md, PRD.md, and README for a new project.

---

## 1. Stack (use these for every client project)

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (App Router) + React + Tailwind + shadcn/ui |
| Backend / API routes | Next.js API routes (simple) or Supabase Edge Functions (complex) |
| Database | Supabase Postgres — caching layer only, never the source of truth |
| Auth | Supabase Auth |
| Data source | Google Sheets via Service Account (read-only) |
| CRM | GoHighLevel (GHL) — REST API + PIT token |
| Deployment | Vercel (`master` branch → auto-deploy) |

### Why this stack?
- Google Sheets is always the client's real source of truth — we don't replace it, we read it
- Supabase caches Sheets data so the UI is fast and we don't hammer the Sheets API
- Vercel + Next.js = zero infra, instant deploys from git push
- shadcn/ui gives us consistent, unstyled-by-default components we fully control

---

## 2. Project Bootstrap Checklist

When starting a new client project from scratch:

1. `npx create-next-app@latest [project-name] --typescript --tailwind --app --src-dir --import-alias "@/*"`
2. Install shadcn: `npx shadcn@latest init`
3. Install core deps: `npm install googleapis @supabase/supabase-js lucide-react`
4. Create `.env` (never commit) and `.env.example` (safe to commit)
5. Add `.env` to `.gitignore` immediately — before the first commit
6. Create `dev` branch: `git checkout -b dev`
7. Connect to Vercel: link `master` to production
8. Set up Google Service Account in Google Cloud Console — share the Sheet with the service account email (Viewer role)
9. Create a Supabase project — enable RLS on every table from day one

---

## 3. File Structure (replicate for every project)

```
src/
├── app/
│   ├── layout.tsx          – Root layout; wraps all pages in <Sidebar>
│   ├── page.tsx            – Overview / main page
│   └── [route]/page.tsx    – One file per nav item
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx     – Collapsible dark sidebar (see pattern below)
│   ├── KpiCard.tsx         – Stat card with optional delta indicator
│   ├── DateRangePicker.tsx – URL-param-driven date filter
│   ├── PageHeader.tsx      – Page title + DateRangePicker row
│   └── [Feature]Chart.tsx  – One file per chart
├── lib/
│   ├── sheets.ts           – Google Sheets client (getAuth + fetch functions)
│   ├── ghl.ts              – GHL API calls
│   ├── supabase.ts         – Supabase client init
│   ├── dateRange.ts        – PRESETS array + date calc helpers
│   └── utils.ts            – cn() and shared helpers
├── hooks/                  – Custom React hooks
└── types/                  – TypeScript interfaces for all data shapes
```

---

## 4. Environment Variables Template

Copy this into `.env.example` for every new project. Fill in real values in `.env`.

```env
# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ── Google Sheets / Service Account ───────────────────────────────────────────
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your_google_sheet_id_here

# ── GoHighLevel (GHL) ─────────────────────────────────────────────────────────
GHL_PIT_[CLIENT]=your_ghl_pit_token_here
GHL_LOCATION_ID_[CLIENT]=your_ghl_location_id_here
```

**Security rules — non-negotiable:**
- `.env` in `.gitignore` before first commit
- Never log, print, or hardcode secrets anywhere in the codebase
- If a PIT or key is pasted in plain text in chat — stop and flag it

---

## 5. Google Sheets Client Pattern

Always use this pattern in `src/lib/sheets.ts`. Never hardcode column indexes — always build a header map.

```ts
import { google } from 'googleapis'

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

export async function getAppointments() {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'Appointments!A1:Z',  // always include header row
  })

  const allRows = res.data.values ?? []
  if (allRows.length < 2) return []

  // Build name→index map so column positions are never hardcoded
  const headers = allRows[0] as string[]
  const col = (name: string) => headers.findIndex((h) => h?.trim() === name)

  return allRows.slice(1).map((r) => ({
    contactId:   r[col('Contact Id')]   ?? '',
    firstName:   r[col('First Name')]   ?? '',
    callDate:    r[col('Call Date')]    ?? '',
    callStatus:  r[col('Call Status')]  ?? '',
    callOutcome: r[col('Call Outcome')] ?? '',
    // ... add fields as needed
  }))
}
```

---

## 6. Sidebar Pattern

Dark sidebar (`#0f1117` background), collapsible, sticky full-height. Active item: teal left border + teal text. Logo area at top, team footer at bottom.

Key classes:
- Sidebar bg: `style={{ backgroundColor: '#0f1117' }}`
- Active nav item: `bg-teal-600/30 text-teal-300 font-medium border-l-2 border-teal-400`
- Inactive: `text-gray-400 hover:bg-white/5 hover:text-gray-200`
- Active icon: `text-teal-400`; inactive: `text-gray-500`
- Logo icon wrapper: `bg-teal-500/20` with `text-teal-400` icon
- Sub-label under logo: `text-teal-400 text-[10px] font-semibold uppercase tracking-widest`

See `src/components/layout/Sidebar.tsx` in the STR Law Guys project for the full reference.

---

## 7. KPI Card Pattern

```tsx
<KpiCard
  label="Cash Collected"
  value="$48,200"
  sub="12 deals"
  icon={DollarSign}
  iconColor="text-emerald-500"
  delta={{ diff: 3200, pct: 7.1, label: 'vs May' }}
/>
```

- White card, `rounded-xl border border-gray-200 shadow-sm`
- Label: `text-[10px] font-semibold text-gray-400 uppercase tracking-wide`
- Value: `text-2xl font-bold text-gray-900` (or custom `valueColor`)
- Delta: `text-[10px]` — green (`text-emerald-600`) for positive, red (`text-red-500`) for negative
- Delta border: `border-t border-gray-100 pt-1.5 mt-1.5`
- `invert` flag on delta flips color logic (lower is better, e.g. avg days to paid)

---

## 8. DateRangePicker Pattern

- Driven by URL search params (`?range=ytd`, `?range=last30`, etc.)
- `PRESETS` array lives in `src/lib/dateRange.ts` — add/remove presets there
- Component reads `current` preset, pushes new `?range=` on change
- Default: `ytd` (Jan 1 of current year → today)
- Style: `appearance-none pl-3 pr-8 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm`
- Teal focus ring: `focus:ring-2 focus:ring-teal-500`

---

## 9. Input Field Rules (apply to every form, modal, and table)

### Phone
- Numbers only — block all non-digit keystrokes
- Live format to `(xxx) xxx-xxxx` as user types; max 10 digits
- `inputMode="numeric"` + `type="tel"`

### Money / Currency
- Digits and one decimal point only — block letters
- Live comma formatting: `898989` → `898,989`
- On blur: always finalize to 2 decimal places — `5964.5` → `5,964.50`
- No `$` prefix inside the input

### Dropdowns (fields with known value sets)
- Populate options from existing data — never hardcode static lists
- Always include `+ Add New` at the bottom in `text-teal-600 font-semibold`
- Selecting `+ Add New` shows a text input + Add button; Enter confirms
- Custom entries saved to `localStorage` per field key, merged on next open
- If a record's value isn't in the list (legacy data), still show it selected — never drop data

---

## 10. Data Table Rules

| Rule | Implementation |
|------|---------------|
| Blank cells | Show nothing — never use `—` as placeholder |
| Long text | `overflow-hidden text-ellipsis whitespace-nowrap max-w-0` + `title` attribute |
| Column headers | Left-aligned, `bg-gray-50`, `sticky top-0 z-20` |
| Cell padding | `px-3 py-1.5` (compact) |
| Borders | `border-collapse` on `<table>`; `border border-gray-200` on every `<th>` and `<td>` |
| Row hover | `hover:bg-blue-50/40 cursor-pointer` |
| Edit column | `sticky right-0 z-10 bg-white` — always visible; pencil icon (`Pencil` size 14) |
| Scroll | `overflow-x-auto` + `maxHeight: calc(100vh - Npx)` — scrollbar at bottom of table, not page |
| Filters | `StatusMultiSelect` checkbox dropdown — never plain `<select>`. Shows "All X" / single value / "N selected". Teal when active. Clear button inside. |
| Pagination | 20/50/100 per page; Prev / page / Next; reset to page 1 on filter or sort change |
| Sort | `ArrowUpDown` → `ArrowUp` / `ArrowDown` icons in header; click toggles asc/desc |
| Column reorder | Drag via `GripVertical` icon; save to `localStorage` with versioned key |
| Column resize | Drag right edge of header; min 60px; save widths to `localStorage` |
| originalIndex | Always map `rawRows` to `{ row, originalIndex }` before filtering/sorting so write-back hits the right sheet row |
| Column reads | Read header row first, build name→index map — never hardcode column positions |
| Modal | Rendered once at table level, driven by `openIdx` state — not per-row |

---

## 11. Git Workflow (non-negotiable)

1. All work on `dev` branch — never commit directly to `master`
2. Push to `dev`, then tell Ed: "Run `npm run dev` → `http://localhost:3000` and verify [specific page/section]"
3. Ed approves → immediately merge `dev` → `master` → push (triggers Vercel deploy)
4. Always tell Ed exactly what to look at when verifying

---

## 12. CLAUDE.md Template (copy and fill in for new project)

```markdown
# CLAUDE.md — [Client Name] [Project Name]

## Project Overview
[One sentence: what this builds, who it's for, what data it reads]

## Tech Stack
- **Frontend**: Next.js + React + Tailwind + shadcn/ui
- **Backend / API**: Supabase Edge Functions
- **Database**: Supabase Postgres (caching layer)
- **Auth**: Supabase Auth
- **Deployment**: Vercel

## Key Commands
- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`

## Key Data Sources
- **Google Sheets**: Spreadsheet ID `[ID]` — [Tab name] (sheet ID `[ID]`)
- **GHL CRM**: Location ID `[ID]`, Pipeline ID `[ID]`
- **Service Account**: `[email]@[project].iam.gserviceaccount.com`

## Sheet Column Map ([Tab name])
| Col | Field | Notes |
|-----|-------|-------|
| A   | [field] | [notes] |

## Team
- [Role]: [Name]
- Tech & Automations: Ed Bedrijo (Brickell Ads Group)

## UI Standards
> See BAG_Client_Dashboard_Handoff.md — Sections 9 and 10

## Git Workflow
[Copy Section 11 from handoff doc]

## Definition of Done
1. Behavior matches the request
2. No console or terminal errors
3. /review passes
4. Changes pushed to `dev` and verified; merged to `master` only on Ed's go-ahead
```

---

## 13. PRD Template (copy and fill in for new project)

```markdown
# PRD — [Client Name] [Project Name]

**Version:** 1.0
**Date:** [date]
**Author:** Ed Bedrijo (Brickell Ads Group)
**Status:** Draft

## 1. Problem Statement
[What manual work does this replace? Where does data live today? What decision can't be made without this?]

## 2. Goals
- [Goal 1]
- [Goal 2]

## 3. Non-Goals (Out of Scope for v1)
- [What we're explicitly not building]

## 4. Target Users
| Persona | Who | Primary need |
|---------|-----|-------------|
| [Name] | [Role] | [What they need to see] |

## 5. User Stories
- As [persona], I want to [action] so that [outcome].

## 6. Functional Requirements

### Must Have (v1)
- [ ] [Feature]

### Nice to Have (v2+)
- [ ] [Feature]

## 7. Data Model
| Field | Type | Source | Notes |
|-------|------|--------|-------|
| [field] | string | Col A | [notes] |

## 8. Integrations
| Service | Purpose | Auth |
|---------|---------|------|
| Google Sheets | Source of truth | Service Account |
| GHL CRM | Contact / opportunity data | PIT token |
| Supabase | Cache | Service role key |

## 9. Success Metrics
- [Measurable outcome 1]
- [Measurable outcome 2]

## 10. Open Questions
- [ ] [Question]
```

---

## 14. README Template

```markdown
# [Client Name] — [Project Name]

Internal dashboard / tool built by Brickell Ads Group.

## Setup

1. Clone the repo
2. Copy `.env.example` → `.env` and fill in values
3. `npm install`
4. `npm run dev` → http://localhost:3000

## Environment Variables

See `.env.example` for the full list. Contact Ed Bedrijo for real values.

## Data Sources

- **Google Sheets**: [Spreadsheet name/ID]
- **GHL CRM**: Location `[ID]`

## Deployment

Pushing to `master` triggers a Vercel production deploy automatically.
Dev work goes to the `dev` branch first — never push directly to `master`.

## Built With

Next.js · React · Tailwind · shadcn/ui · Supabase · Vercel
```

---

## 15. Common Gotchas (carry into every new project)

| Gotcha | Rule |
|--------|------|
| Date parsing | Split date strings — don't use `new Date()` on Sheets dates (avoids double TZ conversion) |
| Column positions | Always build a header→index map; never hardcode column letters/numbers |
| Sheet row index | Track `originalIndex` before filtering so write-back hits the right row |
| GHL Calendar API | Needs `calendarId`/`userId`/`groupId`, not just `locationId` |
| GHL Contacts | List endpoint returns trimmed object — fetch by ID for full custom fields |
| Google Sheets auth | `private_key` needs `.replace(/\\n/g, '\n')` — env vars escape the newlines |
| Supabase RLS | Enable on every table from day one — never ship without it |
| Dropdown legacy values | If a record's value isn't in the option list, still show it selected — never drop data |
| LocalStorage keys | Include a version suffix in `localStorage` keys for column order/width — bump when defaults change |
| Blank cells in tables | Show nothing — never use `—` as placeholder |
