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

  // Native GHL AppointmentDelete webhook (registered in GHL Settings → Webhooks)
  if (str(body.type) === 'AppointmentDelete') {
    const appt = (body.appointment ?? {}) as Record<string, unknown>
    const apptId = str(appt.id)
    if (!apptId) return NextResponse.json({ error: 'appointment.id missing' }, { status: 400 })
    const admin = createAdminClient()
    const { error } = await admin.from('call_outcomes').delete().eq('appointment_id', apptId)
    if (error) {
      console.error('[ghl-webhook] AppointmentDelete error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, action: 'deleted', appointmentId: apptId })
  }

  const cd = (body.customData ?? {}) as Record<string, unknown>
  // GHL sends all custom field values flat on the body (keyed by label)
  const cf = (key: string) => str(body[key])

  const appointmentId = str(cd.appointment_id)
  if (!appointmentId) {
    return NextResponse.json({ error: 'appointment_id is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Hard delete when GHL fires a deletion event (workflow-based)
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

  const closer     = str(cd.closer)
  const contactId  = str(cd.contact_id)
  const calendarData = (body.calendar ?? {}) as Record<string, unknown>

  // setter_last comes from body.calendar.created_by — always populated natively at booking time
  const setterLast = str(calendarData['created_by']) ?? str(cd.setter_last)

  // Store startTime as-is — it's already in the appointment's local timezone (selectedTimezone)
  // Do NOT convert to UTC: display layer splits the string to avoid double-conversion
  const callDate = str(calendarData['startTime'])

  // date_created = contact creation date, already in flat GHL body — no API call needed
  let dateCreated: string | null = null
  const rawDateCreated = str(body['date_created'])
  if (rawDateCreated) {
    const d  = new Date(rawDateCreated)
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    const yy = d.getUTCFullYear()
    dateCreated = `${mm}/${dd}/${yy}`
  }

  // Status-only update (Show / No Show / Canceled trigger)
  if (str(cd.action) === 'update_status') {
    const statusMap: Record<string, string> = {
      showed:    'Show',
      noshow:    'No Show',
      'no show': 'No Show',
      cancelled: 'Canceled',
      canceled:  'Canceled',
      invalid:   'Canceled',
    }
    const rawStatus = str(cd.call_status) ?? ''
    const callStatus = statusMap[rawStatus.toLowerCase()] ?? rawStatus

    const { data, error } = await admin
      .from('call_outcomes')
      .update({ call_status: callStatus, updated_at: new Date().toISOString() })
      .eq('appointment_id', appointmentId)
      .or('call_status.neq.Rescheduled,call_status.is.null')
      .select()
    if (error) {
      console.error('[ghl-webhook] update_status error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, action: 'update_status', records: data })
  }

  const isRescheduled = str(cd.rescheduled) === 'yes'

  // On reschedule: mark all existing rows for this appointment as Rescheduled,
  // then insert a fresh row with the new call_date
  if (isRescheduled) {
    // Mark all existing rows for this appointment as Rescheduled
    // .neq() won't match NULL rows in SQL, so we update all rows and let the next upsert set the new one
    await admin
      .from('call_outcomes')
      .update({ call_status: 'Rescheduled' })
      .eq('appointment_id', appointmentId)
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
    call_date:            callDate,
    calendar:             str(calendarData['calendarName']),
    setter_last:          setterLast,
    setter_first:         str(cd.setter_first),
    setter_current:       str(cd.setter_current),
    closer,
    is_rescheduled:       isRescheduled,
    call_status:          str(cd.call_status) ?? 'Scheduled',
    call_outcome:         null,
    cash_collected:       null,
    total_value:          null,
    lead_quality:         null,
    call_quality:         null,
    recording:            null,
    contact_notes:        cf('Contact Notes'),
    appointment_notes:        null,
    guidance:             cf('Guidance') ?? str(cd.guidance),
    avatar:               cf('Avatar') ?? str(cd.avatar),
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
