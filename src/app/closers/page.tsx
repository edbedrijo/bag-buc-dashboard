'use client'

import { useEffect, useState, Suspense, useMemo, useRef } from 'react'
import { Calendar } from 'lucide-react'
import { createBrowserClient, fetchAll } from '@/lib/supabase'
import AppointmentsTable from './AppointmentsTable'
import type { CallOutcome } from '@/types'

// ── Date presets ──────────────────────────────────────────────────────────────

type Preset = 'this_week' | 'last_week' | 'last_7' | 'last_30' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all'

const PRESET_LABELS: Record<Preset, string> = {
  this_week:  'This week',
  last_week:  'Last week',
  last_7:     'Last 7 days',
  last_30:    'Last 30 days',
  this_month: 'This month',
  last_month: 'Last month',
  this_year:  'This year',
  last_year:  'Last year',
  all:        'All time',
}

function presetRange(p: Preset): { from: Date; to: Date } | null {
  const now = new Date()
  const y   = now.getFullYear()
  const m   = now.getMonth()
  const day = now.getDay() // 0 = Sun

  if (p === 'all') return null

  if (p === 'this_week') {
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - day)
    startOfWeek.setHours(0, 0, 0, 0)
    return { from: startOfWeek, to: now }
  }
  if (p === 'last_week') {
    const startOfThisWeek = new Date(now)
    startOfThisWeek.setDate(now.getDate() - day)
    startOfThisWeek.setHours(0, 0, 0, 0)
    const startOfLastWeek = new Date(startOfThisWeek)
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
    const endOfLastWeek   = new Date(startOfThisWeek)
    endOfLastWeek.setMilliseconds(-1)
    return { from: startOfLastWeek, to: endOfLastWeek }
  }
  if (p === 'last_7')     return { from: new Date(now.getTime() -  7 * 864e5), to: now }
  if (p === 'last_30')    return { from: new Date(now.getTime() - 30 * 864e5), to: now }
  if (p === 'this_month') return { from: new Date(y, m, 1), to: now }
  if (p === 'last_month') return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0, 23, 59, 59) }
  if (p === 'this_year')  return { from: new Date(y, 0, 1), to: now }
  if (p === 'last_year')  return { from: new Date(y - 1, 0, 1), to: new Date(y - 1, 11, 31, 23, 59, 59) }
  return null
}

// ── Team stats table (with inline date filter + totals row) ───────────────────

const TEAM_TABS = ["Tim's Team", "Mark's Team", "Mikey's Team", "Ilya's Team", "Joey's Team"]

function TeamStatsTable({ rows }: { rows: CallOutcome[] }) {
  const [preset,      setPreset]      = useState<Preset>('this_week')
  const [showPresets, setShowPresets] = useState(false)
  const [collapsed,   setCollapsed]   = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowPresets(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Filter rows by selected date range
  const filtered = useMemo(() => {
    const range = presetRange(preset)
    if (!range) return rows
    return rows.filter(r => {
      const d = r.date_in ? new Date(r.date_in) : (r.call_date ? new Date(r.call_date) : null)
      return d && d >= range.from && d <= range.to
    })
  }, [rows, preset])

  const range = presetRange(preset)
  const rangeLabel = range
    ? `${range.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${range.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'All time'

  function fmtMoney(n: number) {
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }

  const stats = TEAM_TABS.map(tab => {
    const tabRows   = filtered.filter(r => r.team_tab === tab)
    const showed    = tabRows.filter(r => r.call_status?.toLowerCase() === 'show').length
    const sold      = tabRows.filter(r => ['PIF', 'Payment Plan', 'Deposit Made'].includes(r.call_outcome ?? '')).length
    const cash      = tabRows.reduce((s, r) => s + (r.cash_collected ?? 0), 0)
    const total     = tabRows.reduce((s, r) => s + (r.total_value   ?? 0), 0)
    const showRate  = tabRows.length > 0 ? (showed / tabRows.length * 100).toFixed(1) + '%' : '—'
    const closeRate = showed > 0         ? (sold   / showed         * 100).toFixed(1) + '%' : '—'
    return { tab, calls: tabRows.length, showed, showRate, sold, closeRate, cash, totalValue: total }
  })

  // Totals row
  const totals = stats.reduce(
    (acc, s) => ({
      calls:      acc.calls      + s.calls,
      showed:     acc.showed     + s.showed,
      sold:       acc.sold       + s.sold,
      cash:       acc.cash       + s.cash,
      totalValue: acc.totalValue + s.totalValue,
    }),
    { calls: 0, showed: 0, sold: 0, cash: 0, totalValue: 0 }
  )
  const totalShowRate  = totals.calls  > 0 ? (totals.showed / totals.calls  * 100).toFixed(1) + '%' : '—'
  const totalCloseRate = totals.showed > 0 ? (totals.sold   / totals.showed * 100).toFixed(1) + '%' : '—'

  const thCls = 'px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap border-b border-gray-200'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Team Performance</p>
            <p className="text-xs text-gray-400">Filtered by selected date range · Date In</p>
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-xs font-medium text-gray-400 hover:text-teal-600 border border-gray-200 hover:border-teal-300 rounded-lg px-2.5 py-1 transition-colors"
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        </div>

        {/* Inline date filter — hidden when collapsed */}
        <div ref={dropRef} className={`relative shrink-0 ${collapsed ? 'invisible' : ''}`}>
          <button
            onClick={() => setShowPresets(p => !p)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 hover:border-gray-300 shadow-sm"
          >
            <Calendar size={13} className="text-gray-400" />
            {PRESET_LABELS[preset]}
            <span className="text-gray-400 text-[10px]">▾</span>
          </button>
          {showPresets && (
            <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-44 py-1">
              {(['this_week', 'last_week', 'last_7', 'last_30', 'this_month', 'last_month', 'this_year', 'last_year', 'all'] as Preset[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPreset(p); setShowPresets(false) }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${preset === p ? 'text-teal-600 font-semibold' : 'text-gray-700'}`}
                >
                  {PRESET_LABELS[p]}
                </button>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-400 text-right mt-1">{rangeLabel}</p>
        </div>
      </div>

      {/* Table */}
      <div className={`overflow-x-auto ${collapsed ? 'hidden' : ''}`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              {['Team', 'Total Calls', 'Showed', 'Show Rate', 'Won', 'Close Rate', 'Cash Collected', 'Total Value'].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.tab} className="hover:bg-blue-50/30 border-b border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">{s.tab}</td>
                <td className="px-3 py-2 text-gray-600">{s.calls}</td>
                <td className="px-3 py-2 text-gray-600">{s.showed}</td>
                <td className="px-3 py-2 text-gray-600">{s.showRate}</td>
                <td className="px-3 py-2 text-gray-600">{s.sold}</td>
                <td className="px-3 py-2 text-gray-600">{s.closeRate}</td>
                <td className="px-3 py-2 text-emerald-700 font-medium">{fmtMoney(s.cash)}</td>
                <td className="px-3 py-2 text-gray-600">{fmtMoney(s.totalValue)}</td>
              </tr>
            ))}

            {/* Totals row */}
            <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
              <td className="px-3 py-2 text-gray-700">Totals</td>
              <td className="px-3 py-2 text-gray-700">{totals.calls}</td>
              <td className="px-3 py-2 text-gray-700">{totals.showed}</td>
              <td className="px-3 py-2 text-gray-700">{totalShowRate}</td>
              <td className="px-3 py-2 text-gray-700">{totals.sold}</td>
              <td className="px-3 py-2 text-gray-700">{totalCloseRate}</td>
              <td className="px-3 py-2 text-emerald-700">{fmtMoney(totals.cash)}</td>
              <td className="px-3 py-2 text-gray-700">{fmtMoney(totals.totalValue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

function ClosersContent() {
  const [allRows, setAllRows] = useState<CallOutcome[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  async function loadRows() {
    const supabase = createBrowserClient()
    const data = await fetchAll<CallOutcome>(supabase, 'call_outcomes', { orderBy: 'call_date', ascending: false })
    setAllRows(data)
  }

  useEffect(() => {
    loadRows().finally(() => setLoading(false))
  }, [])

  async function handleSync() {
    setSyncing(true)
    try {
      await loadRows()
    } finally {
      setSyncing(false)
    }
  }

  function handleRowUpdated(updated: CallOutcome) {
    setAllRows(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Appointments</h1>
      </div>

      <TeamStatsTable rows={allRows} />

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-10 text-center text-sm text-gray-400">
          Loading appointments…
        </div>
      ) : (
        <AppointmentsTable rows={allRows} onRowUpdated={handleRowUpdated} onSync={handleSync} />
      )}
    </div>
  )
}

export default function ClosersPage() {
  return (
    <Suspense>
      <ClosersContent />
    </Suspense>
  )
}
