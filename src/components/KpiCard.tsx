import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Delta {
  diff: number
  pct: number
  label: string
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  iconColor?: string
  delta?: Delta
  /** Flip delta color logic — lower is better (e.g. avg days to paid) */
  invert?: boolean
  valueColor?: string
}

export default function KpiCard({
  label, value, sub, icon: Icon, iconColor = 'text-gray-400',
  delta, invert = false, valueColor = 'text-gray-900',
}: KpiCardProps) {
  const positive = delta ? (invert ? delta.diff < 0 : delta.diff > 0) : false

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <Icon size={16} className={cn('mt-0.5 shrink-0', iconColor)} />
      </div>

      <div>
        <p className={cn('text-2xl font-bold', valueColor)}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>

      {delta && (
        <div className="border-t border-gray-100 pt-1.5 mt-0.5">
          <span
            className={cn(
              'text-[10px] font-medium',
              positive ? 'text-emerald-600' : 'text-red-500'
            )}
          >
            {positive ? '+' : ''}{delta.pct.toFixed(1)}% ({positive ? '+' : ''}{delta.diff > 0 ? `+$${delta.diff.toLocaleString()}` : delta.diff}) {delta.label}
          </span>
        </div>
      )}
    </div>
  )
}
