'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DollarSign, Phone, TrendingUp, CheckCircle } from 'lucide-react'
import { Suspense } from 'react'
import KpiCard from '@/components/KpiCard'
import PageHeader from '@/components/PageHeader'
import { createBrowserClient, fetchAll } from '@/lib/supabase'
import type { CallOutcome, DatePreset } from '@/types'

function fmt$(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function OverviewContent() {
  const params = useSearchParams()
  const _preset = (params.get('range') ?? 'ytd') as DatePreset
  const [rows, setRows] = useState<CallOutcome[]>([])
  const [loading, setLoading] = useState(true)

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

  const totalCalls    = rows.length
  const showed        = rows.filter((r) => r.call_status?.toLowerCase().includes('show')).length
  const showRate      = totalCalls > 0 ? (showed / totalCalls) * 100 : 0
  const cashCollected = rows.reduce((s, r) => s + (r.cash_collected ?? 0), 0)
  const totalValue    = rows.reduce((s, r) => s + (r.total_value ?? 0), 0)

  const outcomeCounts = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.call_outcome || 'Unknown'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <PageHeader title="Overview" sub="BUC Closer Performance" />

      {loading ? (
        <p className="text-sm text-gray-400">Loading data…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Total Calls"     value={totalCalls.toString()}     icon={Phone}       iconColor="text-blue-500" />
            <KpiCard label="Show Rate"       value={`${showRate.toFixed(1)}%`} icon={CheckCircle} iconColor="text-teal-500" />
            <KpiCard label="Cash Collected"  value={fmt$(cashCollected)}       icon={DollarSign}  iconColor="text-emerald-500" />
            <KpiCard label="Total Value"     value={fmt$(totalValue)}          icon={TrendingUp}  iconColor="text-purple-500" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Outcome Breakdown</p>
            <div className="space-y-2">
              {Object.entries(outcomeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([outcome, count]) => (
                  <div key={outcome} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-36 truncate">{outcome}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-teal-500 h-2 rounded-full"
                        style={{ width: `${(count / totalCalls) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-8 text-right">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewContent />
    </Suspense>
  )
}
