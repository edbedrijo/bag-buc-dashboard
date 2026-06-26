import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import type { LogOutcomePayload } from '@/types'

function parseNumber(val: string | number | undefined): number | null {
  if (val === undefined || val === null || val === '') return null
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[$,]/g, ''))
  return isNaN(n) ? null : n
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

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('call_outcomes')
    .upsert(
      {
        appointment_id:      body.appointmentId,
        ghl_id:              body.contactId ?? null,
        call_status:         body.callStatus ?? null,
        call_outcome:        body.callOutcome ?? null,
        cash_collected:      parseNumber(body.cashCollected),
        total_value:         parseNumber(body.totalValue),
        lead_quality:        body.leadQuality ?? null,
        call_quality:        body.callQuality ?? null,
        recording:           body.recording ?? null,
        notes:               body.notes ?? null,
        jerry_grade:         body.jerryGrade ?? null,
        jerry_coaching_note: body.jerryCoachingNote ?? null,
      },
      { onConflict: 'appointment_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[log-outcome] Supabase error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, record: data })
}
