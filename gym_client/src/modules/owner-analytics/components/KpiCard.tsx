import type { ReactNode } from 'react'
import type { KpiType } from '../types'
import { IconChevronRight, IconTrendingDown, IconTrendingUp } from './Icons'

/**
 * Clickable KPI card used on the Owner Analytics grid. Click anywhere inside
 * opens the drill-down drawer for the associated `type`.
 */
export function KpiCard({
  type,
  label,
  value,
  subValue,
  deltaPct,
  deltaLabel,
  tone = 'default',
  icon,
  onOpen,
}: {
  type: KpiType
  label: string
  value: ReactNode
  subValue?: ReactNode
  /** Positive or negative change vs previous period; omit to hide delta pill. */
  deltaPct?: number
  deltaLabel?: string
  tone?: 'default' | 'emerald' | 'blue' | 'amber' | 'rose'
  icon?: ReactNode
  onOpen: (type: KpiType) => void
}) {
  const toneCls = {
    default: 'from-slate-500/20 to-slate-500/5 text-slate-200 ring-white/10',
    emerald: 'from-emerald-500/25 to-emerald-500/5 text-emerald-200 ring-emerald-400/20',
    blue: 'from-sky-500/25 to-sky-500/5 text-sky-200 ring-sky-400/20',
    amber: 'from-amber-500/25 to-amber-500/5 text-amber-200 ring-amber-400/20',
    rose: 'from-rose-500/25 to-rose-500/5 text-rose-200 ring-rose-400/20',
  }[tone]

  const glow = {
    default: 'hover:shadow-[0_8px_28px_-14px_rgba(148,163,184,0.45)]',
    emerald: 'hover:shadow-[0_8px_28px_-14px_rgba(16,185,129,0.55)]',
    blue: 'hover:shadow-[0_8px_28px_-14px_rgba(56,189,248,0.55)]',
    amber: 'hover:shadow-[0_8px_28px_-14px_rgba(245,158,11,0.55)]',
    rose: 'hover:shadow-[0_8px_28px_-14px_rgba(244,63,94,0.55)]',
  }[tone]

  const hasDelta = typeof deltaPct === 'number'
  const deltaPositive = hasDelta && (deltaPct as number) >= 0

  return (
    <button
      type="button"
      data-kpi
      onClick={() => onOpen(type)}
      className={[
        'group relative flex w-full flex-col gap-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left',
        'backdrop-blur-xl transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:scale-[1.02] hover:border-white/20 hover:bg-white/[0.05]',
        'active:scale-[0.99] active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50',
        glow,
      ].join(' ')}
    >
      {/* Tone gradient wash */}
      <div
        aria-hidden
        className={[
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60',
          toneCls,
        ].join(' ')}
      />
      {/* Subtle hover spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(600px circle at var(--x,50%) var(--y,0%), rgba(255,255,255,0.06), transparent 40%)',
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <span
              className={[
                'inline-flex size-10 items-center justify-center rounded-xl ring-1 ring-inset',
                toneCls,
              ].join(' ')}
            >
              {icon}
            </span>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {label}
            </p>
          </div>
        </div>
        <span
          aria-hidden
          className="inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-white"
        >
          <IconChevronRight className="size-3.5" />
        </span>
      </div>

      <div className="relative flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-3xl font-bold tracking-tight text-white">{value}</p>
          {subValue && <p className="mt-1 truncate text-xs text-slate-400">{subValue}</p>}
        </div>
        {hasDelta && (
          <span
            className={[
              'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              deltaPositive
                ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-400/25 bg-rose-500/10 text-rose-300',
            ].join(' ')}
            title={deltaLabel}
          >
            {deltaPositive ? (
              <IconTrendingUp className="size-3" />
            ) : (
              <IconTrendingDown className="size-3" />
            )}
            {deltaPositive ? '+' : ''}
            {deltaPct}%
          </span>
        )}
      </div>
    </button>
  )
}
