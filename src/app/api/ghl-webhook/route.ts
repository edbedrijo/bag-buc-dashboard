import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function parseNumber(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[$,]/g, ''))
  return isNaN(n) ? null : n
}

function str(val: unknown): string | null {
  if (val === undefined || val === null || val === '') return null
  return String(val)
}

// Maps GHL closer name to the team_tab value used in the dashboard
function resolveTeamTab(closer: string | undefined): string | null {
  if (!closer) return null
  const name = closer.toLowerCase()
  if (name.includes('tim'))                          return "Tim's Team"
  if (name.includes('mark'))                         return "Mark's Team"
  if (name.includes('mikey') || name.includes('michael')) return "Mikey's Team"
  if (name.includes('ilya'))                         return "Ilya's Team"
  if (name.includes('joey'))                         return "Joey's Team"
  return null
}

export async function POST(req: NextRequest) {
  // Optional: verify a shared secret so only GHL can call this
  const secret = req.headers.get('x-webhook-secret')
  if (process.env.GHL_WEBHOOK_SECRET && secret !== process.env.GHL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // GHL Webhook action sends a flat payload with custom-mapped fields.
  // Fields come from the Custom Data section of the GHL Webhook action step.
  const appointmentId = str(body.appointment_id)
  if (!appointmentId) {
    return NextResponse.json({ error: 'appointment_id is required' }, { status: 400 })
  }

  const closer = str(body.closer)

  const record = {
    appointment_id: appointmentId,
    ghl_id:         str(body.contact_id),
    team_tab:       resolveTeamTab(closer ?? undefined),
    date_created:   str(body.date_created),
    date_in:        null,
    first_name:     str(body.first_name),
    last_name:      str(body.last_name),
    email:          str(body.email),
    phone:          str(body.phone),
    call_date:      str(body.call_date),
    calendar:       str(body.calendar_name),
    setter:         str(body.setter),
    closer,
    call_status:    null,
    call_outcome:   null,
    cash_collected: null,
    total_value:    null,
    lead_quality:   str(body.lead_quality),
    call_quality:   null,
    recording:      null,
    guidance:       str(body.guidance),
    avatar:         str(body.avatar),
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('call_outcomes')
    .upsert(record, { onConflict: 'appointment_id' })
    .select()
    .single()

  if (error) {
    console.error('[ghl-webhook] Supabase error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, record: data })
}
