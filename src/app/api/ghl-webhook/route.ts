import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function parseNumber(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[$,]/g, ''))
  return isNaN(n) ? null : n
}

// Maps GHL closer name to the team_tab value used in the dashboard
function resolveTeamTab(closer: string | undefined): string | null {
  if (!closer) return null
  const name = closer.toLowerCase()
  if (name.includes('tim'))   return "Tim's Team"
  if (name.includes('mark'))  return "Mark's Team"
  if (name.includes('mikey') || name.includes('michael')) return "Mikey's Team"
  if (name.includes('ilya'))  return "Ilya's Team"
  if (name.includes('joey'))  return "Joey's Team"
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

  const appointmentId = (body.appointment_id ?? body.appointmentId) as string | undefined
  if (!appointmentId) {
    return NextResponse.json({ error: 'appointment_id is required' }, { status: 400 })
  }

  const closer   = body.closer as string | undefined
  const teamTab  = resolveTeamTab(closer)

  const record = {
    appointment_id: appointmentId,
    ghl_id:         (body.contact_id ?? body.ghl_id)     as string | null ?? null,
    team_tab:       teamTab,
    date_created:   body.date_created                    as string | null ?? null,
    date_in:        body.date_in                         as string | null ?? null,
    first_name:     body.first_name                      as string | null ?? null,
    last_name:      body.last_name                       as string | null ?? null,
    email:          body.email                           as string | null ?? null,
    phone:          body.phone                           as string | null ?? null,
    call_date:      (body.call_date ?? body.startTime)   as string | null ?? null,
    calendar:       body.calendar                        as string | null ?? null,
    setter:         body.setter                          as string | null ?? null,
    closer:         closer                               ?? null,
    call_status:    body.call_status                     as string | null ?? null,
    call_outcome:   body.call_outcome                    as string | null ?? null,
    cash_collected: parseNumber(body.cash_collected),
    total_value:    parseNumber(body.total_value),
    lead_quality:   body.lead_quality                    as string | null ?? null,
    call_quality:   body.call_quality                    as string | null ?? null,
    recording:      body.recording                       as string | null ?? null,
    guidance:       body.guidance                        as string | null ?? null,
    avatar:         body.avatar                          as string | null ?? null,
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
