/**
 * BUC Closer Form → Supabase import
 * Uses Google Sheets API v4 (service account JWT) so ALL rows are returned,
 * including any hidden or filter-excluded rows.
 * Run: node scripts/import-sheet.mjs
 */

import { createSign } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env.local')
const envVars = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const [k, ...rest] = l.split('='); return [k.trim(), rest.join('=').trim()] })
)

const SUPABASE_URL     = envVars['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY']
const SA_EMAIL         = envVars['GOOGLE_SERVICE_ACCOUNT_EMAIL']
const SA_KEY_RAW       = envVars['GOOGLE_PRIVATE_KEY']

const SHEET_ID   = '1y-tME_4wRhoFeLozOcnfNflznECa1Qp6NAGUeM2cKVc'
const TEAM_TABS  = ["Tim's Team", "Mark's Team", "Mikey's Team", "Ilya's Team", "Joey's Team"]
const BATCH_SIZE = 100

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// ── Google JWT auth ───────────────────────────────────────────────────────────

async function getAccessToken() {
  if (!SA_EMAIL || !SA_KEY_RAW) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY missing in .env.local')

  // .env stores \n as literal backslash-n — restore actual newlines
  const privateKey = SA_KEY_RAW.replace(/\\n/g, '\n').replace(/^"|"$/g, '')

  const now     = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss:   SA_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  })).toString('base64url')

  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  const sig = signer.sign(privateKey, 'base64url')

  const jwt = `${header}.${payload}.${sig}`

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

// ── Sheets API v4 fetch ───────────────────────────────────────────────────────

async function fetchTabRows(accessToken, tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(tabName)}`
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const data = await res.json()
  if (data.error) throw new Error(`Sheets API error for "${tabName}": ${data.error.message}`)
  return data.values ?? []   // array of string arrays, no filtering applied
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function stripEmoji(val) {
  if (!val) return val
  return String(val).replace(/^[^\p{L}\p{N}]+/u, '').trim()
}

function parseNum(val) {
  if (!val || !String(val).trim()) return null
  const n = parseFloat(String(val).replace(/[$,]/g, ''))
  return isNaN(n) ? null : n
}

function parseDate(val) {
  if (!val || !String(val).trim()) return null
  const parts = String(val).split('/')
  if (parts.length === 3) {
    const [m, d, y] = parts
    return `${y.trim()}-${m.trim().padStart(2, '0')}-${d.trim().padStart(2, '0')}`
  }
  return null
}

function parseDateTime(val) {
  if (!val || !String(val).trim()) return null
  try {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch { return null }
}

// ── Import one tab ────────────────────────────────────────────────────────────

async function importTab(accessToken, tab) {
  console.log(`\nFetching: ${tab}`)
  const allRows = await fetchTabRows(accessToken, tab)

  if (allRows.length < 2) { console.log('  No data.'); return 0 }

  const headers = allRows[0].map(h => String(h).trim())
  const col  = name => headers.indexOf(name)
  const get  = (r, name) => { const i = col(name); return i >= 0 ? String(r[i] ?? '').trim() : '' }

  // Deduplicate by (appointment_id + call_date) — same appointment can have
  // multiple rows when rescheduled, each with a different call_date.
  const seen = new Map()
  for (const r of allRows.slice(1)) {
    if (!r.some(c => String(c ?? '').trim())) continue
    const apptId = get(r, 'Appointment ID')
    if (!apptId) continue
    const callDate   = parseDateTime(get(r, 'Call Date'))
    const dedupeKey  = `${apptId}|${callDate ?? ''}`
    seen.set(dedupeKey, {
      ghl_id:              get(r, 'GHL ID')              || null,
      appointment_id:      apptId,
      team_tab:            tab,
      date_created:        parseDate(get(r, 'Date Created')),
      date_in:             parseDate(get(r, 'Date In')),
      first_name:          get(r, 'First Name')           || null,
      last_name:           get(r, 'Last Name')            || null,
      email:               get(r, 'Email')                || null,
      phone:               get(r, 'Phone')                || null,
      call_date:           callDate,
      calendar:            get(r, 'Calendar')             || null,
      setter:              get(r, 'Setter')               || null,
      closer:              get(r, 'Closer')               || null,
      call_status:         get(r, 'Call Status')          || null,
      call_outcome:        get(r, 'Call Outcome')         || null,
      cash_collected:      parseNum(get(r, 'Cash Collected')),
      total_value:         parseNum(get(r, 'Total Value')),
      lead_quality:        stripEmoji(get(r, 'Lead Quality')) || null,
      call_quality:        stripEmoji(get(r, 'Call Quality')) || null,
      recording:           get(r, 'Recording')            || null,
      guidance:            get(r, 'Guidance')             || null,
      avatar:              get(r, 'Avatar')               || null,
      notes:               get(r, 'Notes')                || null,
      jerry_grade:         get(r, 'Jerry Grade')          || null,
      jerry_coaching_note: get(r, 'Jerry Coaching Note')  || null,
    })
  }

  const records = [...seen.values()]
  console.log(`  ${records.length} unique rows to insert`)

  let total = 0
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('call_outcomes')
      .upsert(batch, { onConflict: 'appointment_id,call_date', ignoreDuplicates: true })
    if (error) {
      console.error(`  ERROR batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
    } else {
      total += batch.length
      process.stdout.write(`  Progress: ${Math.min(i + BATCH_SIZE, records.length)} / ${records.length}\r`)
    }
  }
  console.log(`  Done: ${total} rows inserted          `)
  return total
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('BUC Closer Form → Supabase (Sheets API v4)')
  console.log('============================================')

  console.log('\nAuthenticating with Google service account…')
  const token = await getAccessToken()
  console.log('Access token obtained.')

  console.log('\nTruncating call_outcomes…')
  const { error: delErr } = await supabase
    .from('call_outcomes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (delErr) { console.error('Truncate failed:', delErr.message); process.exit(1) }
  console.log('Table cleared.')

  let grand = 0
  for (const tab of TEAM_TABS) {
    grand += await importTab(token, tab)
  }
  console.log(`\nTotal rows imported: ${grand}`)
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
