# CLAUDE.md — BAG / BuildUp Community (BUC)

Source of truth for this project folder. Load this before making any changes.

---

## Client

BuildUp Community (BUC) — GHL Location ID: `n2gK5CxzjJj4tNIfcKHw`

---

## Google Sheets

**BUC Closer Form** — ID: `1y-tME_4wRhoFeLozOcnfNflznECa1Qp6NAGUeM2cKVc`

Tabs: `Tim's Team`, `Mark's Team`, `Mikey's Team`, `Ilya's Team`, `Joey's Team`

CSV fetched via gviz/tq with sheet name (no GID needed):
```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={TAB_NAME}
```

Column headers (exact names used in scripts):
```
Appointment ID, Call Status, Call Outcome, Cash Collected, Total Value,
Lead Quality, Call Quality, Recording, Notes, Jerry Grade, Jerry Coaching Note
```

---

## GHL Custom Fields

Full list of 239 custom fields (name, ID, fieldKey, dataType) is in [`BUC Custom Fields.md`](BUC%20Custom%20Fields.md).

Key fields for the closer workflow:
| Name | ID | fieldKey |
|------|----|----------|
| Call Outcome | `IzoXTRxKcRJPaeV7UdUF` | `contact.call_outcome` |
| Call Quality | `3t7HegVo7xIzSZMOMQqH` | `contact.call_quality` |
| Call Recording Link | `fky6ZPuu7HFTLLDufROe` | `contact.call_link` |
| Lead Quality | `xrZuDLbMcUYEc7BOMOoH` | `contact.lead_quality` |
| Closer | `flC53v4Nna2Nl9h9WaaQ` | `contact.closer` |
| Setter | `1qzmDz8IoTSfznVPBHx0` | `contact.setter` |
| Setter Name | `1STejTlJgGmZqv0Yl4g6` | `contact.setter_name` |
| fbclid | `0QlbmxOZH68YnFC9ShLC` | `contact.fbclid` |
| AI Summary | `12PiztS9C6BFelzYfFfa` | `contact.ai_summary` |

---

## GHL Calendars (trigger the Log Outcome modal)
- `Strategy Call with Arthur & Team`
- `Strategy Follow Up`

---

## GHL Pipelines — BUC

### 1. Optin (SETTERS) — `s4NE0cQJqQ4fvQ9dxhKH`
| Stage | ID |
|-------|----|
| New Lead | `6c163b5e-d0fc-4bee-8c26-4be4162da039` |
| New Lead Application Not Completed | `ac4540fd-bb8d-45db-9dd2-39255f906a1b` |
| Follow Up Day 1 | `5d971509-0bb0-479e-9341-841ea5f91028` |
| Follow Up Day 2 | `f36f0012-c057-4f32-9e32-a548cc748c30` |
| Follow Up Day 3 | `3145b782-b843-4801-ae41-fe79db74ad40` |
| Follow Up Day 4 | `76d7db1c-1a99-46c2-b144-3727aa44db90` |
| Personal Follow Up | `3bacc998-5ba7-4017-97fe-0c96fdef84d4` |
| Follow Up Warm Pool | `b0629b4d-7b7e-4d6f-b0c6-9972348606ed` |
| Follow Up Cold Pool | `4bd708e5-90fd-41a4-9c1a-3606059d761e` |
| Not Qualified By Setter | `174742e0-7dcd-4edb-a8da-b17119952ed6` |
| Not Interested | `2d4adf8a-f4c5-49d2-b92a-27e7da12a4f1` |

### 2. Applications (SETTERS) — `wNH3zGA9pMmQ74LheBq0`
| Stage | ID |
|-------|----|
| Application - Development | `2ec6cd5f-d73e-4aaf-a3f6-24d424f1c682` |
| Application - Wholesale | `6e5755a8-f962-4a6b-9f2c-53352d8cd2a9` |
| Intro Session | `f057fe70-27a0-40e5-b2b6-8239222585a3` |
| Follow Up Day 1 | `269472b2-d00f-4194-84ba-520e1dda9e47` |
| Follow Up Day 2 | `3cd6e559-29ee-487f-998c-5c037ca6e7f9` |
| Follow Up Day 3 | `3cbb9fb9-770a-4664-8d73-d64a34ec76b6` |
| Follow Up Day 4 | `464b672f-aed5-4ace-8280-6833c68140bd` |
| Personal Follow up | `dfe204a8-4095-4499-ae7a-2aea580e00ab` |
| Follow Up Warm | `263116ce-1f95-4c85-b488-12ec312c1b38` |
| Automated Nurture | `432f8c53-21a6-40ae-be05-08c80e0432c7` |
| Bad Number | `aef32dbf-5c2c-498e-8220-e877dee52bd9` |
| Not Qualified By Setter | `ce45c69f-6762-4935-bad0-cb9054b0b61c` |
| Not Interested | `92091812-a1c8-4a77-b7fc-702a4220175c` |

### 3. Closers Pipeline (CLOSERS) — `Qfk24STdYpMUTOeVkWcO`
| Stage | ID |
|-------|----|
| Booked Call | `a38b06f8-5ee4-453b-85d3-1fa88b61eda6` |
| Call No-show | `648a3207-6ff5-4be6-98dc-1ae62bd36524` |
| Follow Up Booked | `0b4f7e4a-c50c-4fdb-9560-e80fa9bdd312` |
| Checkpoint 1 | `a1481a87-5a4f-44aa-8157-cba8c8c8d38e` |
| Checkpoint 2 | `109fe498-cada-44b4-baec-b357cddcc046` |
| Checkpoint 3 | `9039daeb-c7eb-473a-b67d-9cccdcc58cc2` |
| Follow Up Long | `b67d24af-f17e-41ca-8640-1d1a8db790b5` |
| Nurture | `927a7768-69d0-4347-a622-f4e26de9e357` |
| Unqualified | `94882671-caa6-4caa-8781-7aabb75ee7ba` |
| Deposit Made | `60ad3bc1-be57-4ec3-86b9-c838cf732c23` |
| Onboarding Sent | `7dfc2abe-c7e9-46f6-99ab-a2df42d0e8b5` |
| Onboarding Completed | `959c246f-026c-4cbc-b380-ece6f2181c71` |
| UPSELL | `5f50def6-9aab-4f4f-b424-438142f9b94a` |

### 4. Lead Magnets — `wIDsQdCWftWHfhV2eP3P`
| Stage | ID |
|-------|----|
| New Lead | `022ad1ec-6103-47d1-9c35-543cbace13de` |
| Replied | `60726dd0-1cfe-42fc-8631-4f7ae44af209` |
| Follow Up 1x | `546c83f6-0430-4574-9a44-fb876f3aa24d` |
| Follow Up 2x | `3611ea33-ab41-4c28-860a-98b7083a1274` |
| Follow Up 3x | `8e029b83-ef86-4a78-be13-58a183420124` |
| Follow Up 4x | `66c5692d-3cb1-4173-950a-aab594799ab5` |
| Setter Personal Follow Up | `8f0504db-122e-4456-9c98-8b174a4ea700` |
| Follow Up Pool | `16272f89-8745-404b-a52f-3f4fdbd2206e` |

### 5. Masterclass — `2if0woR4uTYuN980p0fg`
| Stage | ID |
|-------|----|
| Opt in | `2e4da008-0de1-488e-8147-224783fe116c` |
| Not Attended | `1c515b6c-a7fb-4a9e-b08d-90d8b7642911` |
| Attended | `c84e1a49-956b-45c6-883a-d42d428030d6` |
| Texted "Live / Here" | `0f8f0901-da1a-44dd-a64a-2ac51e20a30c` |
| Texted 'Build" | `1156dbcd-1e27-4beb-b67b-ac41655c65ac` |
| Application Submitted | `4f9eb7ee-baca-4ead-93c1-f33e581eff94` |
| Follow Up Day 1 | `08d21a25-dbd3-4f3d-9372-9c6738bec38c` |
| Follow Up Day 2 | `814b5a1c-8647-4a61-a0aa-536d42e8f87e` |
| Follow Up Day 3 | `8d4f2eb0-b810-4780-9ff6-50dc3b4f0288` |
| Follow Up Day 4 | `1d09ee36-ba28-4f82-82c3-809ffd3f4a74` |
| Personal Follow Up | `0c7f4c68-ed13-4ee1-aaf6-5371d93938af` |
| Offer Reply | `52799602-9c1e-4f45-bc0f-9b19956ba26a` |
| Purchased | `ce35b39b-066b-4700-b3f0-f493dcf3c9b7` |

### 6. Reactivation — `ydU4HXu4YFmo8euVgRe6`
| Stage | ID |
|-------|----|
| Closers Reactivation | `aed57f86-a377-491d-8ab4-556a8974f15b` |
| Blast (AI) Started | `2ff512f5-9396-479b-9b3b-a86f4b380bcd` |
| Blast (AI) Replied | `1d1a0fb8-f25c-49c4-8aca-16688353e69f` |
| Personal Follow Up | `69d64e1e-a1d8-4fdb-b54c-4ec85001280a` |
| Nurture - Closers | `c8423a0e-8cd1-417a-b9f6-f79658b7a6ce` |

### Mastermind / Onboarding — `QBmhdmFsAQPu1nTsvSwQ`
| Stage | ID |
|-------|----|
| New Member | `92a3d032-dd29-406b-9a22-4ec07b59ec35` |
| Docs Signed | `be1b9fa2-fc94-4435-b9a0-ccfc1e1bbe96` |
| Intake Form Completed | `ed1d9b9e-4cd6-4901-bfe7-dc2279eae6b2` |
| Strategy Sent | `e6bb5191-e5a2-49b0-9866-f77b0659d274` |
| Week 1-2: Training + Setup | `16a91e17-7741-4182-bb67-e0bf17c21244` |
| Week 3-4: Builder Outreach | `fe459aff-c5b2-430d-aa98-8fb532b74315` |
| Week 5-8: Deal Structuring | `ce0b3619-9b6c-4abb-8aae-b267ddb78f77` |
| Week 9-12: Deal Pipeline | `da343fe1-44ac-4a85-9ad8-4b48543fbc63` |
| Joseph Check-In | `c95e3862-ed0a-4e28-a4de-0cf93d0e6984` |
| Active Member - Year 2+ | `cd71d61c-7c67-487d-ad76-9af820288128` |
| Churned | `b6df4488-6579-4a75-bf67-883ba225617c` |

### 7. Marketing API Conversion Tracking (Marketing) — `IuM23LsRdjv3406HBZ45`
Used by Meta CAPI workflows. Stage IDs wired to GHL workflow triggers.

| Stage | ID | Meta Event / Workflow |
|-------|----|-----------------------|
| Qualified Applications | `b4f11cd7-04b4-468c-8665-e211b2166fa1` | — |
| Intro Call Booked | `73de87ad-f113-4136-be0b-a568ea388ae4` | — |
| Booked Strategy Call | `4a3debf8-46ad-4e52-9a7f-f794c73825c3` | Meta - Booked Strategy Call |
| Masterclass Purchase | `81bfe013-d9e3-4abf-be20-fa6db1a4fb42` | Meta - Masterclass Purchase (value: 997) |
| Wholesale Purchase | `faeddbfe-2e8d-42f0-8f5d-5a154d4c1386` | — |
| Mentorship Purchase | `12f637c8-d5b5-4692-b62e-706866a0fddc` | Meta - Mentorship Purchase (value: 12500) |

### 8. Marketing API Conversion Tracking — `EyeF1XdtQuMsNoFSMVDI`
| Stage | ID |
|-------|----|
| Qualified Applications - Meta | `0e34f9e4-a3a4-4a2c-8215-a79270292f73` |
| Booked Intro Call - Meta | `cd3262bf-83ac-4ed5-ab92-e147d11dadd8` |
| Booked Strategy Call - Meta | `ca4a6300-acc8-4ef1-8266-7698e423ae5b` |
| Masterclass Purchase - Meta | `61ae7412-4d35-4073-b670-9bb43fe4288e` |
| Wholesale Purchase - Meta | `6d1332ca-6854-4c47-89eb-9fcf6ea66811` |
| Mentorship Purchase - Meta | `feafa4d4-e9e2-40ab-b889-70fd66cf5dc3` |

---

## n8n

Base URL: `https://n8n.srv1021441.hstgr.cloud`

| Workflow | Webhook path | Status |
|----------|-------------|--------|
| BUC – Log Outcome | see `.env` as `N8N_WEBHOOK_BUC_LOG_OUTCOME` | built, not yet active |
| STR – Log Outcome | TBD | not yet built |

Webhook test path: `791ebe05-19c3-41d5-ad2c-8de75009948c` (BUC Log Outcome)
Production path replaces `/webhook-test/` with `/webhook/` — swap after confirming test works.

---

## File Map

| File | What it does |
|------|-------------|
| `closer-outcome-modal.js` | BUC — GHL custom JS. Injects Log Outcome button into appointment cards, pre-fills from BUC Closer Form sheet, submits via n8n webhook. Not yet deployed (no BUC GHL access yet). |
| `str-outcome-modal.js` | STR Law Guys test copy — used for debugging before BUC GHL access was granted. Not for production. |
| `BUC - Log Outcome n8n.json` | n8n workflow — receives modal submit, finds row by Appointment ID across tabs, updates Google Sheet. Import into n8n then connect Google Sheets credential. |
| `Meta - Booked Strategy Call.json` | GHL workflow export — fires Meta CAPI event when strategy call is booked. |
| `Meta - Mentorship Purchase.json` | GHL workflow export — fires Meta CAPI event on mentorship purchase tag. |
| `Meta - Masterclass Purchase.json` | GHL workflow export — fires Meta CAPI event on masterclass purchase tag. |
| `Build Up — Meta Conversions API Setup & Optimization Runbook.md` | Pedro's runbook — source of truth for Meta CAPI setup steps and stage mappings. |

---

## Modal — Appointment ID Resolution

GHL stores appointments with composite keys: `apptId_contactId`
Scripts strip the contact suffix via `cleanApptId()` before matching.

Time-based card matching (fixes contacts with multiple appointments):
- Intercept XHR + fetch responses containing `appointment` in the URL
- Store `apptId → { startTime, ... }` in `apptRegistry`
- On button click, parse `startTime` from ISO string directly (no `new Date()` — avoids UTC conversion bug)
- Match formatted time (e.g. `10:30`) against card text

---

## Sensitive Values

All secrets are in `.env` — never hardcoded. Reference `.env.example` for the full list.
Do not read `.env` unless Ed explicitly says to.
