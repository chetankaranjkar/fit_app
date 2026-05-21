import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Search } from 'lucide-react'
import { LEAD_SOURCE_OPTIONS, leadSourceLabel } from '../../lib/leadSources'
import { LeadSourceIcon } from './LeadSourceIcons'

const triggerClass =
  'flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-left text-sm text-slate-100 shadow-inner shadow-black/20 backdrop-blur-xl transition focus:outline-none focus:ring-2 focus:ring-violet-500/45 focus:border-violet-500/30'

const listClass =
  'absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-white/12 bg-slate-950/95 py-1 shadow-2xl shadow-violet-950/40 backdrop-blur-xl'

const itemClass =
  'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-100 transition hover:bg-white/[0.08]'

export function LeadSourceCombobox({
  value,
  onChange,
  customValue,
  onCustomChange,
  error,
  customError,
  disabled,
}: {
  value: string
  onChange: (code: string) => void
  customValue: string
  onCustomChange: (v: string) => void
  error?: string
  customError?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return LEAD_SOURCE_OPTIONS
    return LEAD_SOURCE_OPTIONS.filter(
      (o) => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s),
    )
  }, [q])

  const selectedLabel = value ? leadSourceLabel(value) : ''

  return (
    <div ref={rootRef} className="relative sm:col-span-2">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
        Lead source <span className="text-rose-400/90">*</span>
      </p>
      <button
        type="button"
        disabled={disabled}
        className={`${triggerClass} ${error ? 'border-rose-500/40 ring-1 ring-rose-500/25' : ''} disabled:opacity-50`}
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {value ? (
            <>
              <LeadSourceIcon name={LEAD_SOURCE_OPTIONS.find((o) => o.value === value)?.icon ?? 'other'} />
              <span className="truncate">{selectedLabel}</span>
            </>
          ) : (
            <span className="text-slate-500">Select how they heard about us…</span>
          )}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className={listClass}
            role="listbox"
          >
            <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 px-2 py-2 backdrop-blur-md">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  autoFocus
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-2 text-xs text-white placeholder:text-slate-600 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  placeholder="Search…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-500">No matches</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={value === opt.value}
                  className={`${itemClass} ${value === opt.value ? 'bg-violet-500/15 text-violet-100' : ''}`}
                  onClick={() => {
                    onChange(opt.value)
                    if (opt.value !== 'OTHER') onCustomChange('')
                    setOpen(false)
                    setQ('')
                  }}
                >
                  <LeadSourceIcon name={opt.icon} />
                  <span>{opt.label}</span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {value === 'OTHER' && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Please specify source <span className="text-rose-400/90">*</span>
              </span>
              <input
                type="text"
                value={customValue}
                onChange={(e) => onCustomChange(e.target.value)}
                placeholder="Enter source details"
                className={`mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white shadow-inner backdrop-blur-xl placeholder:text-slate-600 focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/35 ${
                  customError ? 'border-rose-500/45 ring-1 ring-rose-500/25' : ''
                }`}
              />
              {customError && <p className="mt-1 text-xs text-rose-400">{customError}</p>}
              <p className="mt-1 text-[11px] text-slate-500">
                Examples: Local event, Society camp, Newspaper, Corporate referral
              </p>
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
