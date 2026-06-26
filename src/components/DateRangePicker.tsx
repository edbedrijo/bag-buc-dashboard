'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { PRESETS } from '@/lib/dateRange'
import type { DatePreset } from '@/types'

export default function DateRangePicker() {
  const router = useRouter()
  const params = useSearchParams()
  const current = (params.get('range') ?? 'ytd') as DatePreset

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    const url = new URL(window.location.href)
    url.searchParams.set('range', val)
    router.push(url.pathname + url.search)
  }

  return (
    <div className="relative">
      <select
        value={current}
        onChange={handleChange}
        className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">▼</span>
    </div>
  )
}
