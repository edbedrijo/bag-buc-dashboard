import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import type { LogOutcomePayload } from '@/types'

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}

function parseNumber(val: string | number | undefined): number | null {
  if (val === undefined || val === null || val === '') return null
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[$,]/g, ''))
  return isNaN(n) ? null : n
}

function resolveTeamTab(closer: string | undefined): string | null {
  if (!closer) return null
  const name = closer.toLowerCase()
  if (name.includes('tim'))                               return "Tim's Team"
  if (name.includes('mark'))                              return "Mark's Team"
  if (name.includes('mikey') || name.includes('michael')) return "Mikey's Team"
  if (name.includes('ilya'))                              return "Ilya's Team"
  if (name.includes('joey'))                              return "Joey's Team"
  return null
}

async function patchGHLAppointmentStatus(appointmentId: string, callStatus: string): Promise<{ status: number; body: string } | { error: string } | { skipped: string }> {
  if (!process.env.GHL_PIT_BUC_TEST) return { skipped: 'GHL_PIT_BUC_TEST not set' }
  const mappedStatus = ({
    'Show':      'showed',
    'No Show':   'noshow',
    'Canceled':  'cancelled',
    'Scheduled': 'confirmed',
  } as Record<string, string>)[callStatus] ?? callStatus.toLowerCase()

  const headers = {
    Authorization: `Bearer ${process.env.GHL_PIT_BUC_TEST}`,
    Version: '2021-04-15',
    'Content-Type': 'application/json',
  }

  try {
    // Fetch appointment first to get required fields for PUT
    const getRes = await fetch(`https://services.leadconnectorhq.com/calendars/appointments/${appointmentId}`, { headers })
    const getJson = await getRes.json() as { appointment?: Record<string, unknown> }
    const appt = getJson.appointment
    if (!appt) return { error: 'Could not fetch appointment from GHL' }

    const res = await fetch(`https://services.leadconnectorhq.com/calendars/events/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: { ...headers, Version: 'v3' },
      body: JSON.stringify({
        calendarId:        appt.calendarId,
        locationId:        appt.locationId,
        startTime:         appt.startTime,
        endTime:           appt.endTime,
        appointmentStatus: mappedStatus,
      }),
    })
    const body = await res.text()
    return { status: res.status, body }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function POST(req: NextRequest) {
  let body: LogOutcomePayload

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.appointmentId) {
    return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
  }

  const admin  = createAdminClient()
  const closer = body.closer ?? null

  const { data, error } = await admin
    .from('call_outcomes')
    .upsert(
      {
        appointment_id:      body.appointmentId,
        ghl_id:              body.contactId     ?? null,
        call_date:           body.callDate       ?? null,
        closer,
        team_tab:            resolveTeamTab(closer ?? undefined),
        setter_last:         body.setter         ?? null,
        call_status:         body.callStatus     ?? null,
        call_outcome:        body.callOutcome    ?? null,
        cash_collected:      parseNumber(body.cashCollected),
        total_value:         parseNumber(body.totalValue),
        lead_quality:        body.leadQuality    ?? null,
        call_quality:        body.callQuality    ?? null,
        recording:           body.recording      ?? null,
        notes:               body.notes          ?? null,
        jerry_grade:         body.jerryGrade     ?? null,
        jerry_coaching_note: body.jerryCoachingNote ?? null,
      },
      { onConflict: 'appointment_id,call_date' }
    )
    .select()
    .single()

  if (error) {
    console.error('[log-outcome] Supabase error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Write call_status back to GHL appointment so both stay in sync
  let ghlPatch = null
  if (body.callStatus && body.appointmentId) {
    ghlPatch = await patchGHLAppointmentStatus(body.appointmentId, body.callStatus)
  }

  return NextResponse.json({ success: true, record: data, ghlPatch })
}
