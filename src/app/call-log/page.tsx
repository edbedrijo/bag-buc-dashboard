'use client'

import { useEffect, useState, Suspense } from 'react'
import PageHeader from '@/components/PageHeader'
import { createBrowserClient, fetchAll } from '@/lib/supabase'
import type { CallOutcome } from '@/types'

const PAGE_SIZE_OPTIONS = [20, 50, 100]

const COLUMNS: { key: keyof CallOutcome; label: string }[] = [
  { key: 'team_tab',      label: 'Team' },
  { key: 'closer',        label: 'Closer' },
  { key: 'first_name',    label: 'First Name' },
  { key: 'last_name',     label: 'Last Name' },
  { key: 'call_date',     label: 'Call Date' },
  { key: 'call_status',   label: 'Call Status' },
  { key: 'call_outcome',  label: 'Outcome' },
  { key: 'cash_collected', label: 'Cash Collected' },
  { key: 'total_value',   label: 'Total Value' },
  { key: 'lead_quality',  label: 'Lead Quality' },
  { key: 'call_quality',  label: 'Call Quality' },
  { key: 'jerry_grade',   label: 'Jerry Grade' },
  { key: 'notes',         label: 'Notes' },
]

function fmt$(n: number | null) {
  if (n == null) return ''
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function cellValue(row: CallOutcome, key: keyof CallOutcome): string {
  const v = row[key]
  if (key === 'cash_collected' || key === 'total_value') return fmt$(v as number | null)
  if (key === 'call_date' && v) return new Date(v as string).toLocaleDateString()
  return v != null ? String(v) : ''
}

type SortDir = 'asc' | 'desc'

function CallLogContent() {
  const [rows, setRows]         = useState<CallOutcome[]>([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [outcomeFilter, setOutcomeFilter] = useState<string[]>([])
  const [sortKey, setSortKey]   = useState<keyof CallOutcome | null>(null)
  const [sortDir, setSortDir]   = useState<SortDir>('asc')

  useEffect(() => {
    const supabase = createBrowserClient()
    async function load() {
      try {
        const data = await fetchAll<CallOutcome>(supabase, 'call_outcomes', { orderBy: 'call_date', ascending: false })
        setRows(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const allOutcomes = [...new Set(rows.map((r) => r.call_outcome).filter(Boolean))] as string[]

  let filtered = outcomeFilter.length > 0
    ? rows.filter((r) => outcomeFilter.includes(r.call_outcome ?? ''))
    : rows

  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows   = filtered.slice((page - 1) * pageSize, page * pageSize)

  function toggleSort(key: keyof CallOutcome) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function toggleOutcome(v: string) {
    setOutcomeFilter((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    )
    setPage(1)
  }

  return (
    <div>
      <PageHeader title="Call Log" sub="All outcome rows across all teams" />

      <div className="flex gap-2 mb-4 flex-wrap">
        {allOutcomes.map((o) => (
          <button
            key={o}
            onClick={() => toggleOutcome(o)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              outcomeFilter.includes(o)
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'
            }`}
          >
            {o}
          </button>
        ))}
        {outcomeFilter.length > 0 && (
          <button
            onClick={() => { setOutcomeFilter([]); setPage(1) }}
            className="px-3 py-1 rounded-full text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading data…</p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-gray-50">
                <tr>
                  {COLUMNS.map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => toggleSort(key)}
                      className="px-3 py-2 border border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                    >
                      {label}
                      {sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/40">
                    {COLUMNS.map(({ key }) => {
                      const val = cellValue(row, key)
                      return (
                        <td
                          key={key}
                          title={val}
                          className="px-3 py-1.5 border border-gray-200 text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px]"
                        >
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Rows per page:</span>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => { setPageSize(n); setPage(1) }}
                  className={`px-2 py-0.5 rounded text-xs border ${pageSize === n ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>{filtered.length} rows</span>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-0.5 rounded border border-gray-200 disabled:opacity-40">Prev</button>
              <span>Page {page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-2 py-0.5 rounded border border-gray-200 disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function CallLogPage() {
  return (
    <Suspense>
      <CallLogContent />
    </Suspense>
  )
}
