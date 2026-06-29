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

  const cd = (body.customData ?? {}) as Record<string, unknown>

  const appointmentId = str(cd.appointment_id)
  if (!appointmentId) {
    return NextResponse.json({ error: 'appointment_id is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Hard delete when GHL fires a deletion event
  if (str(cd.action) === 'deleted') {
    const { error } = await admin
      .from('call_outcomes')
      .delete()
      .eq('appointment_id', appointmentId)
    if (error) {
      console.error('[ghl-webhook] delete error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, action: 'deleted' })
  }

  const closer    = str(cd.closer)
  const contactId = str(cd.contact_id)

  // Fetch full contact + appointment from GHL API server-side
  let dateCreated:    string | null = str(cd.date_created)
  let apptCreatedBy:  string | null = null   // setter who booked — resolved from appointment API
  let ghlAppt:        Record<string, unknown> | null = null

  if (process.env.GHL_PIT_BUC) {
    const ghlHeaders = {
      Authorization: `Bearer ${process.env.GHL_PIT_BUC}`,
      Version: '2021-07-28',
      Accept: 'application/json',
    }

    const fetches: Promise<void>[] = []

    if (contactId) {
      fetches.push(
        fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, { headers: ghlHeaders })
          .then(r => r.ok ? r.json() : null)
          .then((json: { contact?: { dateAdded?: string } } | null) => {
            const raw = json?.contact?.dateAdded
            if (raw) {
              const d   = new Date(raw)
              const cst = new Date(d.getTime() + -6 * 60 * 60 * 1000)
              const mm  = String(cst.getUTCMonth() + 1).padStart(2, '0')
              const dd  = String(cst.getUTCDate()).padStart(2, '0')
              const yy  = cst.getUTCFullYear()
              dateCreated = `${mm}/${dd}/${yy}`
            }
          })
          .catch(e => console.error('[ghl-webhook] contact fetch error:', e))
      )
    }

    fetches.push(
      fetch(`https://services.leadconnectorhq.com/calendars/appointments/${appointmentId}`, { headers: ghlHeaders })
        .then(r => r.ok ? r.json() : null)
        .then((json: { appointment?: Record<string, unknown> } | null) => {
          if (json?.appointment) {
            ghlAppt = json.appointment
            // Try known field names for the booking creator (setter)
            apptCreatedBy = str(ghlAppt.createdBy ?? ghlAppt.created_by ?? ghlAppt.bookedBy ?? null)
          }
        })
        .catch(e => console.error('[ghl-webhook] appointment fetch error:', e))
    )

    await Promise.all(fetches)
  }

  // Status-only update (Show / No Show / Canceled trigger)
  if (str(cd.action) === 'update_status') {
    const { data, error } = await admin
      .from('call_outcomes')
      .update({ call_status: str(cd.call_status), updated_at: new Date().toISOString() })
      .eq('appointment_id', appointmentId)
      .select()
      .single()
    if (error) {
      console.error('[ghl-webhook] update_status error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, action: 'update_status', record: data })
  }

  const record = {
    appointment_id:       appointmentId,
    ghl_id:               contactId,
    team_tab:             resolveTeamTab(closer ?? undefined),
    date_created:         dateCreated,
    date_in:              str(cd.date_in),
    first_name:           str(cd.first_name),
    last_name:            str(cd.last_name),
    email:                str(cd.email),
    phone:                str(cd.phone),
    call_date:            str(cd.call_date) ?? str(ghlAppt?.startTime),
    calendar:             str(cd.calendar_name),
    // apptCreatedBy (from GHL API) is the most reliable setter_last source at booking time
    setter_last:          apptCreatedBy ?? str(cd.setter_last),
    // TEMP: dump raw appointment payload into notes so we can inspect field names via Supabase
    notes:                ghlAppt ? JSON.stringify(ghlAppt) : null,
    setter_first:         str(cd.setter_first),
    setter_current:       str(cd.setter_current),
    closer,
    is_rescheduled:       str(cd.rescheduled) === 'yes',
    call_status:          str(cd.call_status) ?? null,
    call_outcome:         null,
    cash_collected:       null,
    total_value:          null,
    lead_quality:         null,
    call_quality:         null,
    recording:            null,
    guidance:             str(cd.guidance),
    avatar:               str(cd.avatar),
    utm_source:           str(cd.utm_source),
    utm_campaign:         str(cd.utm_campaign),
    utm_medium:           str(cd.utm_medium),
    utm_content:          str(cd.utm_content),
    latest_att_source:    str(cd.latestTrafficSource),
    latest_att_channel:   str(cd.latestChannelSource),
    latest_att_asset:     str(cd.latestAssetSource),
  }

  const { data, error } = await admin
    .from('call_outcomes')
    .upsert(record, { onConflict: 'appointment_id,call_date' })
    .select()
    .single()

  if (error) {
    console.error('[ghl-webhook] Supabase error:', error?.message)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, record: data })
}
