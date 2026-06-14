import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MemberBatchStat } from '../../hooks/useTrainerMemberStats'

const COPY = {
  coach: {
    totalLabel: 'Total Members Assigned',
    totalHint: 'Assigned',
    distributionLabel: 'Members By Batch',
  },
  admin: {
    totalLabel: 'Total Members',
    totalHint: 'In directory',
    distributionLabel: 'Members By Shift',
  },
} as const

export type MembersSummaryStripProps = {
  variant: 'coach' | 'admin'
  total: number
  active: number
  inactive: number
  batches: MemberBatchStat[]
  maxBatchCount: number
  loading?: boolean
}

type StripTone = 'violet' | 'emerald' | 'spectrum'

const TONE_STYLES: Record<
  StripTone,
  { border: string; glow: string; sheen: string; hoverShadow: string }
> = {
  violet: {
    border: 'border-violet-400/15',
    glow: 'from-violet-500/10 via-transparent to-indigo-600/5',
    sheen: 'from-white/[0.14] via-white/[0.04] to-transparent',
    hoverShadow: 'hover:shadow-[0_8px_32px_-12px_rgba(139,92,246,0.35)]',
  },
  emerald: {
    border: 'border-emerald-400/15',
    glow: 'from-emerald-500/10 via-transparent to-teal-600/5',
    sheen: 'from-white/[0.14] via-white/[0.04] to-transparent',
    hoverShadow: 'hover:shadow-[0_8px_32px_-12px_rgba(16,185,129,0.3)]',
  },
  spectrum: {
    border: 'border-blue-400/12',
    glow: 'from-blue-500/8 via-violet-500/6 to-fuchsia-500/5',
    sheen: 'from-white/[0.12] via-white/[0.03] to-transparent',
    hoverShadow: 'hover:shadow-[0_8px_32px_-12px_rgba(59,130,246,0.28)]',
  },
}

function StripCell({
  children,
  className = '',
  tone = 'violet',
  groupName = 'strip',
  introActive = false,
}: {
  children: ReactNode
  className?: string
  tone?: StripTone
  groupName?: 'strip' | 'batch'
  introActive?: boolean
}) {
  const t = TONE_STYLES[tone]
  const groupClass = groupName === 'batch' ? 'group/batch' : 'group/strip'

  return (
    <div
      className={[
        groupClass,
        introActive ? 'member-bar-intro' : '',
        'relative flex min-h-0 flex-col justify-center overflow-hidden rounded-xl px-3 py-2 sm:px-3.5',
        'border bg-[#0a101c]/80 backdrop-blur-xl',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_24px_-8px_rgba(0,0,0,0.55)]',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-px hover:border-white/20',
        t.border,
        t.hoverShadow,
        className,
      ].join(' ')}
    >
      {/* Base depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_38%,rgba(0,0,0,0.25)_100%)]"
      />
      {/* Accent wash */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.glow} opacity-90`}
      />
      {/* Top gloss sheen */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b ${t.sheen}`}
      />
      {/* Specular line */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      <div className="relative z-[1]">{children}</div>
    </div>
  )
}

function GlossBar({
  barClass,
  widthPct,
  staggerMs = 0,
}: {
  barClass: string
  widthPct: number
  staggerMs?: number
}) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-black/30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06]">
      <div
        className={`member-bar-fill relative h-full origin-left rounded-full ${barClass} shadow-[0_0_8px_-2px_rgba(255,255,255,0.15)] group-hover/batch:shadow-[0_0_14px_-2px_rgba(255,255,255,0.25)]`}
        style={{ width: `${widthPct}%`, animationDelay: `${staggerMs}ms` }}
      >
        <div
          aria-hidden
          className="member-bar-shimmer pointer-events-none absolute inset-0 overflow-hidden rounded-full opacity-0"
          style={{ animationDelay: `${staggerMs + 120}ms` }}
        >
          <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        </div>
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/35 to-transparent"
        />
      </div>
    </div>
  )
}

export function MembersSummaryStrip({
  variant,
  total,
  active,
  inactive,
  batches,
  maxBatchCount,
  loading = false,
}: MembersSummaryStripProps) {
  const copy = COPY[variant]
  const displayTotal = loading ? '—' : total.toLocaleString()
  const displayActive = loading ? '—' : active.toLocaleString()
  const topBatches = useMemo(
    () => [...batches].sort((a, b) => b.count - a.count).slice(0, 4),
    [batches],
  )
  const batchSignature = topBatches.map((b) => `${b.key}:${b.count}`).join('|')
  const [barIntro, setBarIntro] = useState(false)

  useEffect(() => {
    if (loading || topBatches.length === 0) {
      setBarIntro(false)
      return
    }

    setBarIntro(false)
    let endTimer: number | undefined
    const startTimer = window.setTimeout(() => {
      setBarIntro(true)
      endTimer = window.setTimeout(() => setBarIntro(false), 1400)
    }, 50)

    return () => {
      window.clearTimeout(startTimer)
      if (endTimer != null) window.clearTimeout(endTimer)
    }
  }, [loading, batchSignature, topBatches.length])

  return (
    <div
      className="members-summary-strip grid min-h-[104px] grid-cols-1 gap-2.5 sm:grid-cols-2 sm:min-h-[112px] lg:grid-cols-12 lg:min-h-[120px]"
      aria-label="Member summary"
    >
      <StripCell tone="violet" className="sm:col-span-1 lg:col-span-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">{copy.totalLabel}</p>
        <p className="mt-0.5 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-2xl font-bold leading-none tabular-nums text-transparent">
          {displayTotal}
        </p>
        <p className="mt-1 text-[10px] text-slate-500">{copy.totalHint}</p>
      </StripCell>

      <StripCell tone="emerald" className="sm:col-span-1 lg:col-span-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Active Members</p>
        <p className="mt-0.5 text-2xl font-bold leading-none tabular-nums text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">
          {displayActive}
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          {loading ? 'Loading…' : `${inactive.toLocaleString()} inactive`}
        </p>
      </StripCell>

      <StripCell tone="spectrum" groupName="batch" introActive={barIntro} className="sm:col-span-2 lg:col-span-8">
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {copy.distributionLabel}
        </p>
        <div className="flex min-h-0 flex-col justify-center gap-1">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-3 animate-pulse rounded-full bg-white/[0.06]" />
            ))
          ) : topBatches.length === 0 ? (
            <p className="text-[10px] text-slate-500">No batch data</p>
          ) : (
            topBatches.map((batch, index) => {
              const widthPct = maxBatchCount > 0 ? Math.max(8, (batch.count / maxBatchCount) * 100) : 0
              return (
                <div
                  key={batch.key}
                  className="grid grid-cols-[minmax(0,5.5rem)_1fr_auto] items-center gap-2 sm:grid-cols-[minmax(0,7rem)_1fr_auto]"
                >
                  <span className="truncate text-[10px] font-medium text-slate-200">{batch.label}</span>
                  <GlossBar barClass={batch.barClass} widthPct={widthPct} staggerMs={index * 90} />
                  <span className="min-w-[1.75rem] text-right text-[10px] font-semibold tabular-nums text-white/95">
                    {batch.count.toLocaleString()}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </StripCell>
    </div>
  )
}
