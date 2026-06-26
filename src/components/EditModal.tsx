'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import type { CallOutcome } from '@/types'

// ── Dropdown options ──────────────────────────────────────────────────────────

const CALL_STATUS_OPTIONS  = ['Show', 'No Show', 'Rescheduled', 'Canceled']
const CALL_OUTCOME_OPTIONS = ['PIF', 'Payment Plan', 'Deposit Made', 'Follow Up Scheduled', 'Not Sold', 'Not Qualified', 'Not Interested']
const LEAD_QUALITY_OPTIONS = ['High Value', 'Qualified', 'So-So', 'Low Quality', 'Bad Lead']
const CALL_QUALITY_OPTIONS = ['Excellent Call', 'Good Call', 'Average Call', 'Weak Call', 'Bad Call']
const JERRY_GRADE_OPTIONS  = ['A', 'B', 'C', 'D']

// ── Phone formatter ───────────────────────────────────────────────────────────

function formatPhoneInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
        <option value="">— select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  row:      CallOutcome
  closers:  string[]
  setters:  string[]
  onClose:  () => void
  onSaved:  (updated: CallOutcome) => void
}

export default function EditModal({ row, closers, setters, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    first_name:          row.first_name          ?? '',
    last_name:           row.last_name           ?? '',
    email:               row.email               ?? '',
    phone:               formatPhoneInput(row.phone ?? ''),
    date_in:             row.date_in             ?? '',
    call_date:           row.call_date
      ? new Date(row.call_date).toISOString().slice(0, 16)
      : '',
    closer:              row.closer              ?? '',
    setter:              row.setter              ?? '',
    call_status:         row.call_status         ?? '',
    call_outcome:        row.call_outcome        ?? '',
    cash_collected:      row.cash_collected      != null ? String(row.cash_collected) : '',
    total_value:         row.total_value         != null ? String(row.total_value)    : '',
    lead_quality:        row.lead_quality        ?? '',
    call_quality:        row.call_quality        ?? '',
    recording:           row.recording           ?? '',
    notes:               row.notes               ?? '',
    jerry_grade:         row.jerry_grade         ?? '',
    jerry_coaching_note: row.jerry_coaching_note ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createBrowserClient()

    const updates: Partial<CallOutcome> = {
      first_name:          form.first_name          || null,
      last_name:           form.last_name           || null,
      email:               form.email               || null,
      phone:               form.phone               || null,
      date_in:             form.date_in             || null,
      call_date:           form.call_date           ? new Date(form.call_date).toISOString() : null,
      closer:              form.closer              || null,
      setter:              form.setter              || null,
      call_status:         form.call_status         || null,
      call_outcome:        form.call_outcome        || null,
      cash_collected:      form.cash_collected      ? parseFloat(form.cash_collected)  : null,
      total_value:         form.total_value         ? parseFloat(form.total_value)     : null,
      lead_quality:        form.lead_quality        || null,
      call_quality:        form.call_quality        || null,
      recording:           form.recording           || null,
      notes:               form.notes               || null,
      jerry_grade:         form.jerry_grade         || null,
      jerry_coaching_note: form.jerry_coaching_note || null,
    }

    const { data, error: err } = await supabase
      .from('call_outcomes')
      .update(updates)
      .eq('id', row.id)
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    onSaved(data as CallOutcome)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[620px] max-w-[95vw] max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Edit Appointment</h2>
            <p className="text-xs text-gray-400 mt-0.5">Update appointment details</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name">
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Last Name">
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', formatPhoneInput(e.target.value))}
                placeholder="(512) 635-5976"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date In">
              <input
                type="date"
                value={form.date_in}
                onChange={e => set('date_in', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Call Date">
              <input
                type="datetime-local"
                value={form.call_date}
                onChange={e => set('call_date', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Call outcome */}
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Call Status"  value={form.call_status}  onChange={v => set('call_status',  v)} options={CALL_STATUS_OPTIONS}  />
            <SelectField label="Call Outcome" value={form.call_outcome} onChange={v => set('call_outcome', v)} options={CALL_OUTCOME_OPTIONS} />
          </div>

          {/* Closer / Setter */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Closer">
              <select value={form.closer} onChange={e => set('closer', e.target.value)} className={inputCls}>
                <option value="">— select —</option>
                {closers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Setter">
              <select value={form.setter} onChange={e => set('setter', e.target.value)} className={inputCls}>
                <option value="">— select —</option>
                {setters.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cash Collected">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">$</span>
                <input
                  type="number"
                  value={form.cash_collected}
                  onChange={e => set('cash_collected', e.target.value)}
                  placeholder="0.00"
                  className={`${inputCls} pl-6`}
                />
              </div>
            </Field>
            <Field label="Total Value">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">$</span>
                <input
                  type="number"
                  value={form.total_value}
                  onChange={e => set('total_value', e.target.value)}
                  placeholder="0.00"
                  className={`${inputCls} pl-6`}
                />
              </div>
            </Field>
          </div>

          {/* Quality */}
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Lead Quality" value={form.lead_quality} onChange={v => set('lead_quality', v)} options={LEAD_QUALITY_OPTIONS} />
            <SelectField label="Call Quality" value={form.call_quality} onChange={v => set('call_quality', v)} options={CALL_QUALITY_OPTIONS} />
          </div>

          {/* Recording */}
          <Field label="Recording URL">
            <div className="flex gap-2">
              <input
                type="url"
                value={form.recording}
                onChange={e => set('recording', e.target.value)}
                placeholder="https://..."
                className={`${inputCls} flex-1`}
              />
              {form.recording && (
                <a
                  href={form.recording}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg text-teal-600 hover:bg-teal-50 whitespace-nowrap transition-colors"
                >
                  Open ↗
                </a>
              )}
            </div>
          </Field>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Closer notes..."
              className={`${inputCls} resize-none`}
            />
          </Field>

          {/* Jerry Review */}
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Jerry Grade" value={form.jerry_grade} onChange={v => set('jerry_grade', v)} options={JERRY_GRADE_OPTIONS} />
            <div /> {/* spacer */}
          </div>

          <Field label="Jerry Coaching Note">
            <textarea
              value={form.jerry_coaching_note}
              onChange={e => set('jerry_coaching_note', e.target.value)}
              rows={2}
              placeholder="Coaching notes..."
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
