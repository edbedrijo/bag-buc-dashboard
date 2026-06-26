'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { GripVertical, ArrowUp, ArrowDown, ArrowUpDown, Pencil, Search, X, ExternalLink, Settings2 } from 'lucide-react'
import EditModal from '@/components/EditModal'
import type { CallOutcome } from '@/types'

// ── Column definitions ────────────────────────────────────────────────────────

type ColKey =
  | 'ghl_id' | 'appointment_id' | 'date_created' | 'date_in'
  | 'first_name' | 'last_name' | 'email' | 'phone'
  | 'call_date' | 'calendar' | 'setter' | 'closer'
  | 'call_status' | 'call_outcome' | 'cash_collected' | 'total_value'
  | 'lead_quality' | 'call_quality' | 'recording' | 'guidance'
  | 'avatar' | 'notes' | 'jerry_grade' | 'jerry_coaching_note'

interface ColDef {
  key:       ColKey
  label:     string
  sortField?: string
  defaultW:  number
}

const ALL_COLS: ColDef[] = [
  { key: 'ghl_id',             label: 'GHL ID',             defaultW: 160 },
  { key: 'appointment_id',     label: 'Appointment ID',     defaultW: 160 },
  { key: 'date_created',       label: 'Date Created',       sortField: 'date_created',   defaultW: 120 },
  { key: 'date_in',            label: 'Date In',            sortField: 'date_in',        defaultW: 100 },
  { key: 'first_name',         label: 'First Name',         sortField: 'first_name',     defaultW: 130 },
  { key: 'last_name',          label: 'Last Name',          sortField: 'last_name',      defaultW: 130 },
  { key: 'email',              label: 'Email',              defaultW: 200 },
  { key: 'phone',              label: 'Phone',              defaultW: 140 },
  { key: 'call_date',          label: 'Call Date',          sortField: 'call_date',      defaultW: 155 },
  { key: 'calendar',           label: 'Calendar',           defaultW: 130 },
  { key: 'setter',             label: 'Setter',             defaultW: 110 },
  { key: 'closer',             label: 'Closer',             defaultW: 110 },
  { key: 'call_status',        label: 'Call Status',        defaultW: 130 },
  { key: 'call_outcome',       label: 'Call Outcome',       defaultW: 175 },
  { key: 'cash_collected',     label: 'Cash Collected',     sortField: 'cash_collected', defaultW: 130 },
  { key: 'total_value',        label: 'Total Value',        sortField: 'total_value',    defaultW: 120 },
  { key: 'lead_quality',       label: 'Lead Quality',       defaultW: 120 },
  { key: 'call_quality',       label: 'Call Quality',       defaultW: 120 },
  { key: 'recording',          label: 'Recording',          defaultW: 120 },
  { key: 'guidance',           label: 'Guidance',           defaultW: 200 },
  { key: 'avatar',             label: 'Avatar',             defaultW: 100 },
  { key: 'notes',              label: 'Notes',              defaultW: 200 },
  { key: 'jerry_grade',        label: 'Jerry Grade',        defaultW: 110 },
  { key: 'jerry_coaching_note',label: 'Jerry Coaching Note',defaultW: 220 },
]

// Visible columns in display order, then hidden ones appended after
const DEFAULT_ORDER: ColKey[] = [
  'first_name', 'last_name', 'email', 'phone', 'call_date',
  'setter', 'closer', 'call_status', 'call_outcome',
  'cash_collected', 'total_value', 'lead_quality', 'call_quality',
  'recording', 'notes', 'jerry_grade', 'jerry_coaching_note',
  // hidden by default — appear in Manage Fields but not in the table
  'ghl_id', 'appointment_id', 'date_created', 'date_in', 'calendar', 'guidance', 'avatar',
]

// Hidden by default
const DEFAULT_HIDDEN = new Set<ColKey>([
  'ghl_id', 'appointment_id', 'date_created', 'date_in', 'calendar', 'guidance', 'avatar',
])

// First Name cannot be hidden (minimum identifier)
const LOCKED_COLS = new Set<ColKey>(['first_name'])

const DEFAULT_WIDTHS = Object.fromEntries(ALL_COLS.map(c => [c.key, c.defaultW])) as Record<ColKey, number>

const LS_ORDER  = 'buc_appt_colOrder_v1'
const LS_WIDTHS = 'buc_appt_colWidths_v1'
const LS_HIDDEN = 'buc_appt_colHidden_v1'

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayStatus(s: string | null) { return s || 'Scheduled' }

function formatPhone(raw: string | null): string {
  if (!raw) return ''
  const d = raw.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  return raw
}

function fmtDate(val: string | null) {
  if (!val) return ''
  try {
    const d = new Date(val)
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  } catch { return val }
}

function fmtDateTime(val: string | null) {
  if (!val) return ''
  try {
    const d = new Date(val)
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch { return val }
}

function parseSortVal(row: CallOutcome, key: string): string | number {
  if (key === 'cash_collected') return row.cash_collected ?? 0
  if (key === 'total_value')    return row.total_value    ?? 0
  if (key === 'first_name')     return (row.first_name    ?? '').toLowerCase()
  if (key === 'last_name')      return (row.last_name     ?? '').toLowerCase()
  if (key === 'date_in')        return row.date_in        ?? ''
  if (key === 'date_created')   return row.date_created   ?? ''
  if (key === 'call_date')      return row.call_date      ?? ''
  return ''
}

// ── Chip ─────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'Show':        'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'No Show':     'bg-red-50 text-red-600 border border-red-200',
  'Canceled':    'bg-gray-100 text-gray-500 border border-gray-200',
  'Rescheduled': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Scheduled':   'bg-blue-50 text-blue-700 border border-blue-200',
}

const OUTCOME_COLORS: Record<string, string> = {
  'PIF':                  'bg-teal-50 text-teal-700 border border-teal-200',
  'Payment Plan':         'bg-teal-50 text-teal-700 border border-teal-200',
  'Deposit Made':         'bg-cyan-50 text-cyan-700 border border-cyan-200',
  'Follow Up Scheduled':  'bg-blue-50 text-blue-700 border border-blue-200',
  'Not Sold':             'bg-red-50 text-red-600 border border-red-200',
  'Not Qualified':        'bg-gray-100 text-gray-500 border border-gray-200',
  'Not Interested':       'bg-gray-100 text-gray-500 border border-gray-200',
}

const LEAD_COLORS: Record<string, string> = {
  'High Value':  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Qualified':   'bg-blue-50 text-blue-700 border border-blue-200',
  'So-So':       'bg-amber-50 text-amber-700 border border-amber-200',
  'Low Quality': 'bg-orange-50 text-orange-700 border border-orange-200',
  'Bad Lead':    'bg-red-50 text-red-600 border border-red-200',
}

const CALL_COLORS: Record<string, string> = {
  'Excellent Call': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Good Call':      'bg-blue-50 text-blue-700 border border-blue-200',
  'Average Call':   'bg-amber-50 text-amber-700 border border-amber-200',
  'Weak Call':      'bg-orange-50 text-orange-700 border border-orange-200',
  'Bad Call':       'bg-red-50 text-red-600 border border-red-200',
}

function Chip({ value, colorMap }: { value: string; colorMap: Record<string, string> }) {
  if (!value) return null
  const cls = colorMap[value] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {value}
    </span>
  )
}

function TruncCell({ value, className }: { value: string; className?: string }) {
  if (!value) return null
  return (
    <span title={value} className={`block overflow-hidden text-ellipsis whitespace-nowrap ${className ?? ''}`}>
      {value}
    </span>
  )
}

// ── Multi-select filter dropdown ──────────────────────────────────────────────

interface MultiSelectProps {
  label:    string
  options:  string[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
}

function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const btnLabel = selected.size === 0 ? label
    : selected.size === 1 ? [...selected][0]
    : `${selected.size} selected`

  const active = selected.size > 0

  function toggle(val: string) {
    const next = new Set(selected)
    next.has(val) ? next.delete(val) : next.add(val)
    onChange(next)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
          active
            ? 'border-teal-400 text-teal-700 bg-teal-50 font-medium'
            : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
        }`}
      >
        {btnLabel}
        <span className="text-gray-400 text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute top-9 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[180px] py-1">
          {options.map(o => (
            <label key={o} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(o)}
                onChange={() => toggle(o)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-400"
              />
              {o}
            </label>
          ))}
          {selected.size > 0 && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { onChange(new Set()); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-teal-600 hover:bg-gray-50 font-medium"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sort button ───────────────────────────────────────────────────────────────

function SortBtn({ label, field, sort, dir, onSort }: {
  label: string; field: string; sort: string; dir: string
  onSort: (f: string) => void
}) {
  const active = sort === field
  return (
    <button
      onClick={e => { e.stopPropagation(); onSort(field) }}
      className="flex items-center gap-1 text-gray-500 font-semibold hover:text-gray-700 transition-colors text-[10px] uppercase tracking-wide"
    >
      {label}
      {active
        ? dir === 'asc'
          ? <ArrowUp className="w-3 h-3 text-teal-500" />
          : <ArrowDown className="w-3 h-3 text-teal-500" />
        : <ArrowUpDown className="w-3 h-3" />}
    </button>
  )
}

// ── Manage Fields modal ───────────────────────────────────────────────────────

interface ManageFieldsProps {
  order:     ColKey[]
  hidden:    Set<ColKey>
  onApply:   (order: ColKey[], hidden: Set<ColKey>) => void
  onClose:   () => void
}

function ManageFieldsModal({ order, hidden, onApply, onClose }: ManageFieldsProps) {
  const [localOrder,  setLocalOrder]  = useState<ColKey[]>([...order])
  const [localHidden, setLocalHidden] = useState<Set<ColKey>>(new Set(hidden))
  const [search, setSearch] = useState('')

  const dragIdx     = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  const filtered = localOrder.filter(k => {
    const col = ALL_COLS.find(c => c.key === k)!
    return col.label.toLowerCase().includes(search.toLowerCase())
  })

  function toggleHidden(key: ColKey) {
    if (LOCKED_COLS.has(key)) return
    setLocalHidden(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function onDragStart(idx: number) { dragIdx.current = idx }
  function onDragEnter(idx: number) { dragOverIdx.current = idx }
  function onDragEnd() {
    if (dragIdx.current === null || dragOverIdx.current === null) return
    if (dragIdx.current === dragOverIdx.current) return
    setLocalOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx.current!, 1)
      next.splice(dragOverIdx.current!, 0, moved)
      return next
    })
    dragIdx.current = null
    dragOverIdx.current = null
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[440px] max-w-[95vw] flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Manage fields</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search fields"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            />
          </div>
        </div>

        {/* Field list */}
        <div className="overflow-y-auto flex-1 px-5 py-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Fields in table
          </p>

          <div className="space-y-0.5">
            {filtered.map((key, idx) => {
              const col    = ALL_COLS.find(c => c.key === key)!
              const locked = LOCKED_COLS.has(key)
              const visible = !localHidden.has(key)

              return (
                <div
                  key={key}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragEnter={() => onDragEnter(idx)}
                  onDragEnd={onDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 group cursor-default"
                >
                  {/* Drag handle */}
                  <GripVertical
                    size={16}
                    className="text-gray-300 group-hover:text-gray-400 shrink-0 cursor-grab active:cursor-grabbing"
                  />

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={visible}
                    disabled={locked}
                    onChange={() => toggleHidden(key)}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-400 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  />

                  {/* Label */}
                  <span className={`flex-1 text-sm ${visible ? 'text-gray-800' : 'text-gray-400'}`}>
                    {col.label}
                  </span>

                  {/* Lock icon for Name */}
                  {locked && (
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(localOrder, localHidden)}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main table component ──────────────────────────────────────────────────────

interface Props {
  rows: CallOutcome[]
  onRowUpdated: (updated: CallOutcome) => void
}

const PAGE_SIZES = [20, 50, 100]

export default function AppointmentsTable({ rows, onRowUpdated }: Props) {
  // Column order, widths, visibility
  const [colOrder,  setColOrder]  = useState<ColKey[]>(DEFAULT_ORDER)
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(DEFAULT_WIDTHS)
  const [hiddenCols, setHiddenCols] = useState<Set<ColKey>>(DEFAULT_HIDDEN)

  // Sort
  const [sortField, setSortField] = useState('call_date')
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc')

  // Filters
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState<Set<string>>(new Set(['Scheduled']))
  const [closerFilter,  setCloserFilter]  = useState<Set<string>>(new Set())

  // Pagination
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Modals
  const [editRow,       setEditRow]       = useState<CallOutcome | null>(null)
  const [manageOpen,    setManageOpen]    = useState(false)

  // Resize
  const resizing          = useRef<{ key: ColKey; startX: number; startW: number } | null>(null)
  const isDraggingReorder = useRef(false)

  // Header drag-reorder
  const dragCol     = useRef<ColKey | null>(null)
  const dragOverCol = useRef<ColKey | null>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(LS_ORDER)
      if (savedOrder) {
        const parsed  = JSON.parse(savedOrder) as ColKey[]
        const valid   = parsed.filter(k => ALL_COLS.some(c => c.key === k))
        const missing = DEFAULT_ORDER.filter(k => !valid.includes(k))
        setColOrder([...valid, ...missing])
      }
    } catch {}
    try {
      const savedWidths = localStorage.getItem(LS_WIDTHS)
      if (savedWidths) setColWidths({ ...DEFAULT_WIDTHS, ...JSON.parse(savedWidths) })
    } catch {}
    try {
      const savedHidden = localStorage.getItem(LS_HIDDEN)
      setHiddenCols(savedHidden ? new Set(JSON.parse(savedHidden) as ColKey[]) : DEFAULT_HIDDEN)
    } catch {}
  }, [])

  // Resize handlers
  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing.current || isDraggingReorder.current) return
    const delta = e.clientX - resizing.current.startX
    const newW  = Math.max(60, resizing.current.startW + delta)
    setColWidths(prev => {
      const next = { ...prev, [resizing.current!.key]: newW }
      try { localStorage.setItem(LS_WIDTHS, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const onResizeUp = useCallback(() => { resizing.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onResizeMove)
    window.addEventListener('mouseup',   onResizeUp)
    return () => {
      window.removeEventListener('mousemove', onResizeMove)
      window.removeEventListener('mouseup',   onResizeUp)
    }
  }, [onResizeMove, onResizeUp])

  function startResize(e: React.MouseEvent, key: ColKey) {
    e.preventDefault()
    resizing.current = { key, startX: e.clientX, startW: colWidths[key] }
  }

  // Header drag-reorder
  function onDragStart(key: ColKey) {
    dragCol.current = key
    isDraggingReorder.current = true
  }
  function onDragEnter(key: ColKey) { dragOverCol.current = key }
  function onDragEnd() { isDraggingReorder.current = false }
  function onDrop(key: ColKey) {
    const from = dragCol.current
    const to   = key
    dragCol.current     = null
    dragOverCol.current = null
    if (!from || from === to) return
    setColOrder(prev => {
      const next  = [...prev]
      const fromI = next.indexOf(from)
      const toI   = next.indexOf(to)
      if (fromI === -1 || toI === -1) return prev
      next.splice(fromI, 1)
      next.splice(toI, 0, from)
      try { localStorage.setItem(LS_ORDER, JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Apply from Manage Fields modal
  function handleManageApply(newOrder: ColKey[], newHidden: Set<ColKey>) {
    setColOrder(newOrder)
    setHiddenCols(newHidden)
    try { localStorage.setItem(LS_ORDER,  JSON.stringify(newOrder))           } catch {}
    try { localStorage.setItem(LS_HIDDEN, JSON.stringify([...newHidden]))     } catch {}
    setManageOpen(false)
  }

  // Unique filter options + modal lists
  const allStatuses = useMemo(() => [...new Set(rows.map(r => displayStatus(r.call_status)))].sort(), [rows])
  const allClosers  = useMemo(() => [...new Set(rows.map(r => r.closer).filter(Boolean))].sort() as string[], [rows])
  const allSetters  = useMemo(() => [...new Set(rows.map(r => r.setter).filter(Boolean))].sort() as string[], [rows])

  // Filter
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statusFilter.size  > 0 && !statusFilter.has(displayStatus(r.call_status)))  return false
      if (closerFilter.size  > 0 && !closerFilter.has(r.closer ?? ''))                return false
      if (search) {
        const q    = search.toLowerCase()
        const name = `${r.first_name ?? ''} ${r.last_name ?? ''}`.toLowerCase()
        if (!name.includes(q) && !(r.email ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [rows, search, statusFilter, closerFilter])

  // Sort
  const sorted = useMemo(() => {
    const col = ALL_COLS.find(c => c.sortField === sortField)
    if (!col) return filtered
    return [...filtered].sort((a, b) => {
      const av = parseSortVal(a, sortField)
      const bv = parseSortVal(b, sortField)
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  // Group by appointment_id (preserve sort order — first occurrence = primary row)
  const groups = useMemo(() => {
    const map = new Map<string, CallOutcome[]>()
    for (const row of sorted) {
      const key = row.appointment_id ?? row.id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    return [...map.values()]
  }, [sorted])

  // Expanded appointment groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  function toggleGroup(apptId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(apptId) ? next.delete(apptId) : next.add(apptId)
      return next
    })
  }

  // Pagination over groups
  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pageGroups = groups.slice((safePage - 1) * pageSize, safePage * pageSize)

  function toggleSort(field: string) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  const hasFilters  = search || statusFilter.size > 0 || closerFilter.size > 0
  const visibleCols = colOrder.map(k => ALL_COLS.find(c => c.key === k)!).filter(c => c && !hiddenCols.has(c.key))
  const totalW      = visibleCols.reduce((s, c) => s + colWidths[c.key], 0) + 48 + 36

  // Cell renderer
  function renderCell(row: CallOutcome, key: ColKey) {
    switch (key) {
      case 'ghl_id':
        return <TruncCell value={row.ghl_id ?? ''} className="text-gray-400 text-xs font-mono" />
      case 'appointment_id':
        return <TruncCell value={row.appointment_id ?? ''} className="text-gray-400 text-xs font-mono" />
      case 'date_created':
        return <span className="whitespace-nowrap text-gray-500 text-xs">{fmtDate(row.date_created)}</span>
      case 'date_in':
        return <span className="whitespace-nowrap text-gray-500">{fmtDate(row.date_in)}</span>
      case 'first_name':
        return <TruncCell value={row.first_name ?? ''} className="font-medium text-gray-800" />
      case 'last_name':
        return <TruncCell value={row.last_name ?? ''} className="font-medium text-gray-800" />
      case 'email':
        return <TruncCell value={row.email ?? ''} className="text-gray-500" />
      case 'phone':
        return <span className="whitespace-nowrap text-gray-600">{formatPhone(row.phone)}</span>
      case 'call_date':
        return <span className="whitespace-nowrap text-gray-600">{fmtDateTime(row.call_date)}</span>
      case 'calendar':
        return <TruncCell value={row.calendar ?? ''} className="text-gray-500 text-xs" />
      case 'setter':
        return <TruncCell value={row.setter ?? ''} className="text-gray-600" />
      case 'closer':
        return <TruncCell value={row.closer ?? ''} className="text-gray-600" />
      case 'call_status':
        return <Chip value={displayStatus(row.call_status)} colorMap={STATUS_COLORS} />
      case 'call_outcome':
        return row.call_outcome ? <Chip value={row.call_outcome} colorMap={OUTCOME_COLORS} /> : null
      case 'cash_collected':
        return row.cash_collected
          ? <span className="font-semibold text-emerald-700 whitespace-nowrap">
              {row.cash_collected.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          : null
      case 'total_value':
        return row.total_value
          ? <span className="text-gray-700 whitespace-nowrap">
              {row.total_value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          : null
      case 'lead_quality':
        return row.lead_quality ? <Chip value={row.lead_quality} colorMap={LEAD_COLORS} /> : null
      case 'call_quality':
        return row.call_quality ? <Chip value={row.call_quality} colorMap={CALL_COLORS} /> : null
      case 'recording':
        return row.recording
          ? <a href={row.recording} target="_blank" rel="noreferrer"
               onClick={e => e.stopPropagation()}
               className="flex items-center gap-1 text-teal-600 hover:text-teal-800 whitespace-nowrap text-xs">
              <ExternalLink size={12} /> Recording
            </a>
          : null
      case 'guidance':
        return <TruncCell value={row.guidance ?? ''} className="text-gray-500 text-xs" />
      case 'avatar':
        return row.avatar
          ? <img src={row.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
          : null
      case 'notes':
        return <TruncCell value={row.notes ?? ''} className="text-gray-500 text-xs" />
      case 'jerry_grade':
        return row.jerry_grade
          ? <span className="text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
              {row.jerry_grade}
            </span>
          : null
      case 'jerry_coaching_note':
        return <TruncCell value={row.jerry_coaching_note ?? ''} className="text-gray-500 text-xs" />
      default:
        return null
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">

      {/* Card header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Appointments</h2>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-300 leading-relaxed hidden sm:block text-right">
            Drag headers to reorder<br />Drag right edge to resize
          </p>
          <button
            onClick={() => setManageOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            <Settings2 size={14} className="text-gray-400" />
            Manage Fields
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name or email…"
            className="pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 w-52"
          />
        </div>

        <MultiSelect label="All Statuses" options={allStatuses} selected={statusFilter}  onChange={s => { setStatusFilter(s);  setPage(1) }} />
        <MultiSelect label="All Closers"  options={allClosers}  selected={closerFilter}  onChange={s => { setCloserFilter(s);  setPage(1) }} />

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(new Set()); setCloserFilter(new Set()); setPage(1) }}
            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium px-2 py-1.5"
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 480px)', overflowY: 'auto' }} onDragOver={e => e.preventDefault()}>
        <table
          className="text-sm border-collapse"
          style={{ tableLayout: 'fixed', minWidth: '100%', width: totalW }}
        >
          <colgroup>
            <col style={{ width: 36 }} />
            {visibleCols.map(c => <col key={c.key} style={{ width: colWidths[c.key] }} />)}
            <col style={{ width: 48 }} />
          </colgroup>

          <thead className="sticky top-0 z-20 bg-gray-50">
            <tr>
              <th className="border border-gray-200 bg-gray-50 w-9" />
              {visibleCols.map(col => (
                <th
                  key={col.key}
                  draggable
                  onDragStart={e => { e.stopPropagation(); onDragStart(col.key) }}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragEnter(col.key) }}
                  onDrop={e => { e.preventDefault(); onDrop(col.key) }}
                  onDragEnd={onDragEnd}
                  className="px-3 py-1.5 text-left select-none cursor-grab active:cursor-grabbing group relative border border-gray-200 bg-gray-50"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <GripVertical className="w-3 h-3 text-gray-300 group-hover:text-gray-400 shrink-0 transition-colors" />
                    {col.sortField
                      ? <SortBtn label={col.label} field={col.sortField} sort={sortField} dir={sortDir} onSort={toggleSort} />
                      : <span className="truncate text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{col.label}</span>
                    }
                  </span>
                  <div
                    onMouseDown={e => { e.stopPropagation(); startResize(e, col.key) }}
                    draggable={false}
                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-teal-200 transition-colors rounded-sm"
                  />
                </th>
              ))}
              <th className="px-3 py-1.5 w-12 border border-gray-200 bg-gray-50 sticky right-0 z-30" />
            </tr>
          </thead>

          <tbody>
            {pageGroups.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleCols.length + 1}
                  className="py-10 text-center text-gray-400 border border-gray-200 whitespace-normal"
                >
                  No appointments match the current filters.
                </td>
              </tr>
            ) : pageGroups.map(group => {
              const primary   = group[0]
              const apptKey   = primary.appointment_id ?? primary.id
              const multi     = group.length > 1
              const expanded  = expandedGroups.has(apptKey)
              const subRows   = group.slice(1)

              return (
                <>
                  {/* Primary row */}
                  <tr
                    key={primary.id}
                    onClick={() => setEditRow(primary)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer border-b border-gray-100"
                  >
                    {/* Group toggle cell */}
                    <td
                      onClick={e => e.stopPropagation()}
                      className="border border-gray-200 text-center w-9 px-1"
                    >
                      {multi && (
                        <button
                          onClick={() => toggleGroup(apptKey)}
                          className="flex items-center justify-center gap-0.5 text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 rounded px-1 py-0.5 hover:bg-teal-100 transition-colors w-full"
                          title={expanded ? 'Collapse' : `${group.length} attempts`}
                        >
                          <span>{expanded ? '▾' : '▸'}</span>
                          <span>×{group.length}</span>
                        </button>
                      )}
                    </td>
                    {visibleCols.map(col => (
                      <td
                        key={col.key}
                        className="px-3 py-1.5 overflow-hidden border border-gray-200 whitespace-nowrap max-w-0"
                      >
                        {renderCell(primary, col.key)}
                      </td>
                    ))}
                    <td
                      onClick={e => e.stopPropagation()}
                      className="px-3 py-1.5 border border-gray-200 bg-white sticky right-0 z-10"
                    >
                      <button
                        onClick={() => setEditRow(primary)}
                        className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Edit appointment"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>

                  {/* Sub-rows (expanded) */}
                  {expanded && subRows.map((row, i) => (
                    <tr
                      key={row.id}
                      onClick={() => setEditRow(row)}
                      className="cursor-pointer transition-colors"
                      style={{ background: i % 2 === 0 ? '#f8fafc' : '#f1f5f9' }}
                    >
                      <td className="border border-gray-200 border-l-4 border-l-teal-300 w-9" />
                      {visibleCols.map(col => (
                        <td
                          key={col.key}
                          className="px-3 py-1.5 overflow-hidden border border-gray-200 whitespace-nowrap max-w-0"
                        >
                          {renderCell(row, col.key)}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 border border-gray-200 bg-slate-50 sticky right-0 z-10">
                        <button
                          onClick={e => { e.stopPropagation(); setEditRow(row) }}
                          className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
        <span>
          Page {safePage} of {totalPages}&nbsp;·&nbsp;{groups.length} appointments ({filtered.length} records)
        </span>
        <div className="flex items-center gap-3">
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button
            disabled={safePage <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          <span className="px-2 py-1 rounded-lg border border-teal-400 bg-teal-50 text-teal-700 font-semibold min-w-[32px] text-center">
            {safePage}
          </span>
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Manage Fields modal */}
      {manageOpen && (
        <ManageFieldsModal
          order={colOrder}
          hidden={hiddenCols}
          onApply={handleManageApply}
          onClose={() => setManageOpen(false)}
        />
      )}

      {/* Edit modal */}
      {editRow && (
        <EditModal
          row={editRow}
          closers={allClosers}
          setters={allSetters}
          onClose={() => setEditRow(null)}
          onSaved={updated => { onRowUpdated(updated); setEditRow(null) }}
        />
      )}
    </div>
  )
}
