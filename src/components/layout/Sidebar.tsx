'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ClipboardList, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',           label: 'Overview',    icon: LayoutDashboard },
  { href: '/closers',    label: 'Closers',     icon: Users },
  { href: '/call-log',   label: 'Call Log',    icon: ClipboardList },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 transition-all duration-200 shrink-0',
        collapsed ? 'w-14' : 'w-52'
      )}
      style={{ backgroundColor: '#0f1117' }}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-3 py-4 border-b border-white/10', collapsed && 'justify-center')}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/20 shrink-0">
          <TrendingUp size={16} className="text-teal-400" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white text-sm font-semibold leading-none">BUC</p>
            <p className="text-teal-400 text-[10px] font-semibold uppercase tracking-widest mt-0.5">Dashboard</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-teal-600/30 text-teal-300 font-medium border-l-2 border-teal-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon
                size={16}
                className={cn(active ? 'text-teal-400' : 'text-gray-500')}
              />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center h-10 border-t border-white/10 text-gray-500 hover:text-gray-300 transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  )
}
