# PRD — BAG / BuildUp Community (BUC) Dashboard

**Version:** 1.0
**Date:** 2026-06-25
**Author:** Ed Bedrijo (Brickell Ads Group)
**Status:** Draft

---

## 1. Problem Statement
BUC closers log call outcomes manually in a shared Google Sheet (BUC Closer Form). There is no way to view, filter, or act on this data without opening the sheet directly. Team leads have no fast way to see call volume, outcome rates, or closer performance. GHL appointment cards have no Log Outcome button, so closers have to context-switch between GHL and Sheets after every call.

## 2. Goals
- Give closers a one-click Log Outcome button inside GHL appointment cards — no tab switching
- Give team leads a live dashboard showing call volume, outcomes, cash collected, and closer performance by date range
- Write outcome data back to the correct row in BUC Closer Form via n8n — no manual sheet editing

## 3. Non-Goals (Out of Scope for v1)
- Setter performance tracking (Setters pipeline — handled separately)
- Real-time GHL pipeline stage automation triggered by outcome selection
- Mobile-optimized UI (desktop only for v1)
- Multi-client support (BUC only for now)

## 4. Target Users
| Persona | Who they are | Primary need |
|---------|-------------|--------------|
| Closer | BUC sales closer (Tim, Mark, Mikey, Ilya, Joey's teams) | Log call outcome from GHL without switching tabs |
| Team Lead | Team captain / manager | See their team's call outcomes and performance at a glance |
| Admin (Ed) | BAG Tech & Automations | Monitor data quality, debug, update field mappings |

## 5. User Stories
- As a closer, I want a Log Outcome button on GHL appointment cards so I can submit call details without leaving GHL.
- As a closer, I want the modal to pre-fill from the existing Closer Form row so I don't retype data already entered.
- As a team lead, I want to filter outcomes by date range and closer so I can review my team's performance weekly.
- As a team lead, I want to see cash collected, total value, and outcome breakdown in one view.
- As Ed, I want n8n to write outcomes back to the correct sheet row so there's no manual reconciliation.

## 6. Functional Requirements

### Must Have (v1)
- [ ] Log Outcome modal injected into BUC GHL appointment cards (closer-outcome-modal.js)
- [ ] Modal pre-fills Call Status, Call Outcome, Cash Collected, Total Value, Lead Quality, Call Quality from BUC Closer Form sheet row matched by Appointment ID
- [ ] Modal submits via n8n webhook → updates correct sheet row across all team tabs
- [ ] n8n workflow (BUC – Log Outcome) receives webhook, finds row by Appointment ID, writes back updated fields
- [ ] Dashboard: KPI cards for total calls, show rate, cash collected, total value
- [ ] Dashboard: breakdown by Call Outcome (sold, no-show, follow-up, etc.)
- [ ] Dashboard: breakdown by closer (filterable by team)
- [ ] Dashboard: date range filter (last 7d, last 30d, MTD, YTD, custom)

### Nice to Have (v2+)
- [ ] Jerry Grade / Coaching Note fields visible in dashboard per call row
- [ ] Recording link playback inline in dashboard
- [ ] Email/Slack digest of weekly closer performance
- [ ] Pipeline stage auto-update in GHL when outcome is logged

## 7. Data Model
| Field | Type | Source | Notes |
|-------|------|--------|-------|
| Appointment ID | string | GHL / Sheet Col A | Composite `apptId_contactId` — strip suffix before matching |
| Call Status | string | Sheet | e.g. Showed, No-show |
| Call Outcome | string | Sheet | e.g. Sold, Follow Up, Not Qualified |
| Cash Collected | number | Sheet | Dollar amount collected at time of call |
| Total Value | number | Sheet | Full deal value |
| Lead Quality | string | Sheet | e.g. Hot, Warm, Cold |
| Call Quality | string | Sheet | e.g. 1–5 rating or label |
| Recording | string (URL) | Sheet | Link to call recording |
| Notes | string | Sheet | Closer's notes |
| Jerry Grade | string | Sheet | Manager grade |
| Jerry Coaching Note | string | Sheet | Manager coaching note |
| Closer | string | GHL custom field | `contact.closer` |
| Team Tab | string | Sheet tab name | Tim's Team, Mark's Team, etc. |

## 8. Integrations
| Service | Purpose | Auth method |
|---------|---------|-------------|
| Google Sheets (BUC Closer Form) | Source of truth for call outcomes | gviz/tq CSV (read) + n8n Service Account (write) |
| GoHighLevel (BUC) | Appointment cards, contact custom fields | PIT token (`GHL_PIT_BUC`) |
| n8n (Hostinger VPS) | Webhook receiver, sheet write-back | Webhook URL in `.env` |
| Supabase | Cache layer for dashboard reads | Service role key |

## 9. Success Metrics
- Closer can log an outcome in < 30 seconds from the GHL appointment card
- Dashboard loads in < 2s for any date range up to YTD
- Zero manual sheet edits required after n8n write-back is live
- n8n correctly identifies and updates the right sheet row 100% of the time in test runs

## 10. Open Questions
- [ ] Which GHL calendars trigger the Log Outcome button? (Current: Strategy Call with Arthur & Team, Strategy Follow Up — confirm with client)
- [ ] Who has access to the dashboard? All closers, or team leads only?
- [ ] Should the modal be read-only for fields already filled, or fully editable?
- [ ] Is Supabase cache needed for v1, or can we query Sheets directly on each dashboard load?
