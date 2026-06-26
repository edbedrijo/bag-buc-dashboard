import type { DatePreset, DatePresetOption, DateRange } from '@/types'

export const PRESETS: DatePresetOption[] = [
  { value: 'last7',  label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'mtd',    label: 'Month to date' },
  { value: 'ytd',    label: 'Year to date' },
]

export function presetToRange(preset: DatePreset): DateRange {
  const today = new Date()
  // Zero out time so comparisons are date-only
  today.setHours(0, 0, 0, 0)

  switch (preset) {
    case 'last7': {
      const from = new Date(today)
      from.setDate(today.getDate() - 6)
      return { from, to: today }
    }
    case 'last30': {
      const from = new Date(today)
      from.setDate(today.getDate() - 29)
      return { from, to: today }
    }
    case 'mtd': {
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today }
    }
    case 'ytd':
    default: {
      return { from: new Date(today.getFullYear(), 0, 1), to: today }
    }
  }
}

// Sheet dates come in as strings like "2026-06-25" or "6/25/2026"
// Split and construct — never use new Date(str) to avoid TZ shift
export function parseDateString(str: string): Date | null {
  if (!str) return null
  // ISO format: YYYY-MM-DD
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3])
  // US format: M/D/YYYY
  const us = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (us) return new Date(+us[3], +us[1] - 1, +us[2])
  return null
}

export function isInRange(dateStr: string, range: DateRange): boolean {
  const d = parseDateString(dateStr)
  if (!d) return false
  return d >= range.from && d <= range.to
}
