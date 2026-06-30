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

async function patchGHLAppointmentStatus(appointmentId: string, callStatus: string) {
  if (!process.env.GHL_PIT_BUC_TEST) return
  const mappedStatus = ({
    'Show':      'showed',
    'No Show':   'noshow',
    'Canceled':  'cancelled',
    'Scheduled': 'confirmed',
  } as Record<string, string>)[callStatus] ?? callStatus.toLowerCase()

  try {
    const res = await fetch(`https://services.leadconnectorhq.com/calendars/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.GHL_PIT_BUC_TEST}`,
        Version: '2021-04-15',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ appointmentStatus: mappedStatus }),
    })
    const text = await res.text()
    console.log('[log-outcome] GHL PATCH status:', res.status, '| body:', text)
  } catch (e) {
    console.error('[log-outcome] GHL appointment PATCH failed:', e)
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
  if (body.callStatus && body.appointmentId) {
    await patchGHLAppointmentStatus(body.appointmentId, body.callStatus)
  }

  return NextResponse.json({ success: true, record: data })
}
