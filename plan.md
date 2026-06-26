# Plan — BAG / BUC Dashboard

**Date:** 2026-06-25
**Status:** Draft
**Scope:** Build the BUC Log Outcome modal (GHL injection) + n8n write-back + closer performance dashboard

---

## Context
BUC closers need a Log Outcome button inside GHL appointment cards. The modal pre-fills from the BUC Closer Form Google Sheet and submits via n8n, which writes results back to the correct row. A separate Next.js dashboard will surface call volume, outcomes, and cash collected for team leads.

## Approach
Phase 1: finish and deploy the GHL modal JS + n8n workflow (already partially built).
Phase 2: scaffold the Next.js dashboard, connect Google Sheets via Service Account, add Supabase cache.
Phase 3: build dashboard pages (overview KPIs, closer breakdown, call log table).

## Tasks

### Phase 1 — Modal + n8n (closer-side tooling)
- [ ] Verify `closer-outcome-modal.js` works against BUC GHL (awaiting GHL access)
- [ ] Test n8n webhook (`791ebe05-19c3-41d5-ad2c-8de75009948c`) with a real BUC appointment row
- [ ] Confirm sheet row lookup works across all 5 team tabs
- [ ] Switch n8n webhook from test path (`/webhook-test/`) to production path (`/webhook/`)
- [ ] Deploy `closer-outcome-modal.js` to BUC GHL custom JS field

### Phase 2 — Dashboard scaffold
- [ ] `npx create-next-app@latest buc-dashboard --typescript --tailwind --app --src-dir --import-alias "@/*"`
- [ ] `npx shadcn@latest init`
- [ ] `npm install googleapis @supabase/supabase-js lucide-react`
- [ ] Create `.env` (never commit) from `.env.example`
- [ ] Add `.env` to `.gitignore` — verify before first commit
- [ ] `git checkout -b dev`
- [ ] Connect Vercel to `master` branch
- [ ] Set up Google Service Account + share BUC Closer Form (Viewer role)
- [ ] Create Supabase project — enable RLS on all tables from day one

### Phase 3 — Dashboard pages
- [ ] `src/lib/sheets.ts` — fetch all tabs, build header→index map, return typed rows
- [ ] `src/lib/supabase.ts` — init client, define cache table schema
- [ ] `src/components/layout/Sidebar.tsx` — dark sidebar per BAG pattern
- [ ] `src/components/KpiCard.tsx` — stat card with delta
- [ ] `src/components/DateRangePicker.tsx` — URL-param driven
- [ ] Overview page: total calls, show rate, cash collected, total value KPI cards
- [ ] Closer breakdown page: filterable by team tab + date range
- [ ] Call log table: all columns, sort/filter, pagination (20/50/100), sticky edit column

## Dependencies
- BUC GHL access (to deploy modal JS) — pending
- Google Service Account created and shared on BUC Closer Form
- Supabase project created (or confirm we're skipping cache for v1)
- `.env` populated with real BUC values

## Definition of Done
- [ ] All Phase 1–3 tasks checked off
- [ ] Log Outcome modal tested on a real BUC appointment card
- [ ] n8n writes back to correct sheet row across all 5 team tabs
- [ ] Dashboard loads in < 2s for YTD date range
- [ ] No console or terminal errors
- [ ] /review passed
- [ ] Committed via /commit; `dev` verified; `master` merged only on Ed's go-ahead

## Risks & Unknowns
- BUC GHL access not yet granted — Phase 1 deployment is blocked until then
- n8n write-back uses Google Sheets credential — need to confirm which Service Account is wired in n8n
- Supabase cache may not be needed for v1 if sheet is small enough (< 5k rows across all tabs)
- GHL calendar names must match exactly — confirm `Strategy Call with Arthur & Team` and `Strategy Follow Up` are the only triggers
