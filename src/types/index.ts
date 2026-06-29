export type TeamTab =
  | "Tim's Team"
  | "Mark's Team"
  | "Mikey's Team"
  | "Ilya's Team"
  | "Joey's Team"

export interface CallOutcome {
  id: string
  ghl_id: string | null
  appointment_id: string | null
  team_tab: TeamTab | null
  date_created: string | null
  date_in: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  call_date: string | null
  calendar: string | null
  setter_first: string | null
  setter_current: string | null
  setter_last: string | null
  closer: string | null
  call_status: string | null
  call_outcome: string | null
  cash_collected: number | null
  total_value: number | null
  lead_quality: string | null
  call_quality: string | null
  recording: string | null
  guidance: string | null
  avatar: string | null
  is_rescheduled: boolean | null
  utm_source: string | null
  utm_campaign: string | null
  utm_medium: string | null
  utm_content: string | null
  latest_att_source: string | null
  latest_att_channel: string | null
  latest_att_asset: string | null
  notes: string | null
  jerry_grade: string | null
  jerry_coaching_note: string | null
  created_at: string
  updated_at: string
}

// Payload sent by the GHL modal when a closer submits an outcome
export interface LogOutcomePayload {
  appointmentId: string
  contactId?: string
  callDate?: string        // ISO string — used as second key for rescheduled appointments
  closer?: string
  setter?: string          // maps to setter_last
  locationId?: string
  triggeredAt?: string
  callStatus?: string
  callOutcome?: string
  cashCollected?: string | number
  totalValue?: string | number
  leadQuality?: string
  callQuality?: string
  recording?: string
  notes?: string
  jerryGrade?: string
  jerryCoachingNote?: string
}

export interface DateRange {
  from: Date
  to: Date
}

export type DatePreset = 'last7' | 'last30' | 'mtd' | 'ytd' | 'custom'

export interface DatePresetOption {
  value: DatePreset
  label: string
}
