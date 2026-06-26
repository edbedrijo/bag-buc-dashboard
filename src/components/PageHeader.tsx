import { Suspense } from 'react'
import DateRangePicker from './DateRangePicker'

interface PageHeaderProps {
  title: string
  sub?: string
}

export default function PageHeader({ title, sub }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <Suspense>
        <DateRangePicker />
      </Suspense>
    </div>
  )
}
