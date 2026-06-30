import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}

function str(val: unknown): string | null {
  if (val === undefined || val === null || val === '') return null
  return String(val)
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

async function fetchFromGHL(contactId: string, appointmentId: string) {
  const headers = {
    Authorization: `Bearer ${process.env.GHL_PIT_BUC}`,
    Version: '2021-07-28',
    Accept: 'application/json',
  }

  const [contactRes, apptRes] = await Promise.all([
    fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, { headers }),
    fetch(`https://services.leadconnectorhq.com/calendars/appointments/${appointmentId}`, { headers }),
  ])

  const contact     = contactRes.ok     ? (await contactRes.json()  as { contact?:     Record<string, unknown> }).contact     : null
  const appointment = apptRes.ok        ? (await apptRes.json()     as { appointment?: Record<string, unknown> }).appointment : null

  return { contact, appointment }
}

// GET /api/call-outcome?appointmentId=xxx&contactId=xxx&callDate=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const appointmentId = searchParams.get('appointmentId')
  const contactId     = searchParams.get('contactId')
  const callDate      = searchParams.get('callDate') // ISO string from apptRegistry

  if (!appointmentId) {
    return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Build query — match on appointment_id + call_date if callDate provided
  let query = admin
    .from('call_outcomes')
    .select('*')
    .eq('appointment_id', appointmentId)

  const { data: existing } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ found: true, record: existing })
  }

  // No row found — fetch from GHL and create it
  if (!contactId || !process.env.GHL_PIT_BUC) {
    return NextResponse.json({ found: false, record: null })
  }

  let record: Record<string, unknown> = { appointment_id: appointmentId, ghl_id: contactId }

  try {
    const { contact, appointment } = await fetchFromGHL(contactId, appointmentId)

    if (contact) {
      // dateAdded → date_created in CST
      let dateCreated: string | null = null
      const raw = contact.dateAdded as string | undefined
      if (raw) {
        const d   = new Date(raw)
        const cst = new Date(d.getTime() + -6 * 60 * 60 * 1000)
        const mm  = String(cst.getUTCMonth() + 1).padStart(2, '0')
        const dd  = String(cst.getUTCDate()).padStart(2, '0')
        const yy  = cst.getUTCFullYear()
        dateCreated = `${mm}/${dd}/${yy}`
      }

      const customFields = (contact.customFields as Array<{ id: string; value: unknown }>) ?? []
      const cf = (fieldId: string) => customFields.find(f => f.id === fieldId)?.value ?? null

      const closer = str(appointment?.assignedUserId
        ? (appointment.user as Record<string, unknown>)?.name
        : null)

      record = {
        ...record,
        date_created:   dateCreated,
        first_name:     str(contact.firstName),
        last_name:      str(contact.lastName),
        email:          str(contact.email),
        phone:          str(contact.phone),
        guidance:       str(contact.guidance ?? cf('contact.guidance')),
        avatar:         str(contact.avatar   ?? cf('contact.avatar')),
        setter_first:   str(cf('gWwM1uGiN93ebRR3X0cT')),   // Setter_First field ID
        setter_current: str(cf('aCkkPWt99NBwCg8K2evm')),   // Setter_Current field ID
        setter_last:    str(cf('s0F82CefcNFxq9riYejO')),   // Setter_Last field ID
        closer,
        team_tab:       resolveTeamTab(closer ?? undefined),
      }
    }

    if (appointment) {
      record.call_date    = str(appointment.startTime)
      record.calendar     = str(appointment.calendarId
        ? (appointment.calendar as Record<string, unknown>)?.name ?? null
        : null)
    }

    // Use callDate from query param if GHL appointment fetch didn't give us one
    if (!record.call_date && callDate) {
      record.call_date = callDate
    }
  } catch (e) {
    console.error('[call-outcome GET] GHL fetch error:', e)
    // Still create a minimal row so the modal can proceed
  }

  const { data: created, error } = await admin
    .from('call_outcomes')
    .insert(record)
    .select()
    .single()

  if (error) {
    console.error('[call-outcome GET] Supabase insert error:', error.message)
    // Return what we have even if insert failed — modal can still show
    return NextResponse.json({ found: false, record })
  }

  return NextResponse.json({ found: false, record: created })
}
