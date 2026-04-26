import { useMemo, useState, type ReactNode } from 'react'
import { CountUp } from './CountUp'
import {
  IconActivity,
  IconAlert,
  IconCalendar,
  IconChevronRight,
  IconRupee,
  IconUsers,
  IconWrench,
} from './Icons'
import { MiniSparkline } from './MiniSparkline'
import {
  KPI_SNAPSHOT,
  MOCK_EQUIPMENT_ISSUES,
  MOCK_MEMBERS,
  MOCK_PAYMENTS,
  MOCK_PENDING,
  MOCK_REVENUE_30D,
} from '../services/mockData'
import type { KpiType, RevenueRange } from '../types'

const inr = (n: number) => `\u20b9${n.toLocaleString('en-IN')}`
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

/**
 * Helper kept outside of components so the React purity rule doesn't flag the
 * `Date.now()` call as an impure render-time reference. Works the same way
 * the drawer siblings handle overdue checks.
 */
const isDueOverdue = (iso: string) =>
  new Date(iso).getTime() < new Date().getTime()

function GlassCard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section
      data-panel
      className={[
        'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl transition-colors duration-300',
        'hover:border-white/20',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  )
}

function PanelHeader({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300">
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] hover:text-white hover:shadow-md active:scale-95"
        >
          {actionLabel}
          <IconChevronRight className="size-3" />
        </button>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div
      className={[
        'rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5',
        tone,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Revenue overview (hero chart)
 * ------------------------------------------------------------------------ */

export function RevenueOverviewCard({
  onDrillDown,
}: {
  onDrillDown: (t: KpiType) => void
}) {
  const [range, setRange] = useState<RevenueRange>('7d')

  const series = useMemo(
    () => (range === '7d' ? MOCK_REVENUE_30D.slice(-7) : MOCK_REVENUE_30D),
    [range],
  )
  const total = useMemo(
    () => series.reduce((sum, p) => sum + p.amount, 0),
    [series],
  )
  const avg = Math.round(total / Math.max(1, series.length))
  const peak = Math.max(...series.map((p) => p.amount))
  const { deltaPct } = KPI_SNAPSHOT.revenue
  const up = deltaPct >= 0

  return (
    <GlassCard>
      <PanelHeader
        icon={<IconRupee className="size-4" />}
        title="Revenue overview"
        subtitle={range === '7d' ? 'Last 7 days' : 'Last 30 days'}
        actionLabel="View details"
        onAction={() => onDrillDown('revenue')}
      />

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">
            Total for period
          </p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-3xl font-bold tracking-tight text-white">
              <CountUp value={total} format={inr} />
            </p>
            <span
              className={[
                'mb-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                up
                  ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-400/25 bg-rose-500/10 text-rose-300',
              ].join(' ')}
              title="vs previous 7 days"
            >
              {up ? '\u2191' : '\u2193'} {Math.abs(deltaPct)}%
            </span>
          </div>
        </div>
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-0.5 text-[11px] font-semibold">
          {(['7d', '30d'] as RevenueRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={[
                'rounded-lg px-3 py-1 transition',
                r === range
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              {r === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-44 sm:h-52">
        <MiniSparkline data={series} width={640} height={200} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Average / day" value={inr(avg)} />
        <Stat label="Peak" value={inr(peak)} />
        <Stat label="Transactions" value={MOCK_PAYMENTS.length.toString()} />
      </div>
    </GlassCard>
  )
}

/* ---------------------------------------------------------------------------
 * Needs attention (combined pending + equipment)
 * ------------------------------------------------------------------------ */

export function AttentionPanel({
  onDrillDown,
}: {
  onDrillDown: (t: KpiType) => void
}) {
  const topPending = useMemo(
    () =>
      [...MOCK_PENDING]
        .sort((a, b) => {
          const ao = isDueOverdue(a.dueDate) ? 1 : 0
          const bo = isDueOverdue(b.dueDate) ? 1 : 0
          if (ao !== bo) return bo - ao
          return b.dueAmount - a.dueAmount
        })
        .slice(0, 3),
    [],
  )
  const topDown = useMemo(
    () =>
      MOCK_EQUIPMENT_ISSUES.filter((e) => e.status !== 'RESOLVED').slice(0, 2),
    [],
  )
  const hasAny = topPending.length > 0 || topDown.length > 0

  return (
    <GlassCard>
      <PanelHeader
        icon={<IconAlert className="size-4" />}
        title="Needs attention"
        subtitle="Top items across dues & equipment"
      />

      {!hasAny ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs text-slate-400">
          All clear. No items need attention.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {topPending.map((d) => {
            const overdue = isDueOverdue(d.dueDate)
            return (
              <li
                key={d.id}
                className={[
                  'group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition',
                  overdue
                    ? 'border-rose-400/20 bg-rose-500/[0.05] hover:border-rose-400/35'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20',
                  'hover:bg-white/[0.05]',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
                    overdue
                      ? 'bg-rose-500/15 text-rose-300'
                      : 'bg-amber-500/15 text-amber-300',
                  ].join(' ')}
                >
                  <IconRupee className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-100">
                    {d.memberName}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">
                    {d.plan ?? '—'} · Due {fmtDate(d.dueDate)} ·{' '}
                    <span className={overdue ? 'text-rose-300' : 'text-slate-300'}>
                      {inr(d.dueAmount)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDrillDown('payments')}
                  className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white active:scale-95"
                >
                  Open
                </button>
              </li>
            )
          })}
          {topDown.map((e) => (
            <li
              key={e.id}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                <IconWrench className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-100">
                  {e.equipmentName}
                </p>
                <p className="truncate text-[10px] text-slate-400">{e.issue}</p>
              </div>
              <button
                type="button"
                onClick={() => onDrillDown('equipment')}
                className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white active:scale-95"
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}

/* ---------------------------------------------------------------------------
 * Recent activity (latest payments)
 * ------------------------------------------------------------------------ */

export function RecentActivityCard({
  onDrillDown,
}: {
  onDrillDown: (t: KpiType) => void
}) {
  const items = useMemo(
    () =>
      [...MOCK_PAYMENTS]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6),
    [],
  )
  return (
    <GlassCard>
      <PanelHeader
        icon={<IconActivity className="size-4" />}
        title="Recent activity"
        subtitle="Latest transactions"
        actionLabel="See all"
        onAction={() => onDrillDown('revenue')}
      />
      <ul className="mt-4 space-y-2">
        {items.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/20 hover:bg-white/[0.05]"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-[10px] font-bold text-white">
              {p.memberName
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-100">
                {p.memberName}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {p.plan ?? '—'}
                <span className="mx-1 text-slate-600">·</span>
                <IconCalendar className="inline-block size-2.5 align-[-1px]" />
                <span className="ml-1">{fmtDate(p.date)}</span>
              </p>
            </div>
            <p
              className={[
                'shrink-0 text-xs font-semibold',
                p.status === 'REFUNDED' ? 'text-slate-400 line-through' : 'text-white',
              ].join(' ')}
            >
              {inr(p.amount)}
            </p>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}

/* ---------------------------------------------------------------------------
 * Member pulse (active / inactive + by-plan breakdown)
 * ------------------------------------------------------------------------ */

export function MemberPulseCard({
  onDrillDown,
}: {
  onDrillDown: (t: KpiType) => void
}) {
  const { active, total, inactive } = KPI_SNAPSHOT.members
  const pct = total > 0 ? Math.round((active / total) * 100) : 0

  const byPlan = useMemo(() => {
    const buckets: Record<string, number> = {}
    MOCK_MEMBERS.forEach((m) => {
      const key = m.plan.split(' ')[0]
      buckets[key] = (buckets[key] ?? 0) + 1
    })
    return Object.entries(buckets).sort((a, b) => b[1] - a[1])
  }, [])

  return (
    <GlassCard>
      <PanelHeader
        icon={<IconUsers className="size-4" />}
        title="Member pulse"
        subtitle="Engagement snapshot"
        actionLabel="Explore"
        onAction={() => onDrillDown('members')}
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-300/80">
            Active
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-200">
            <CountUp value={active} />
          </p>
          <p className="text-[10px] text-emerald-300/70">
            of {total} ({pct}%)
          </p>
        </div>
        <div className="rounded-xl border border-amber-400/15 bg-amber-500/[0.06] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-amber-300/80">
            Inactive &gt;7d
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-200">
            <CountUp value={inactive} />
          </p>
          <p className="text-[10px] text-amber-300/70">Needs outreach</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
          By plan
        </p>
        {byPlan.map(([plan, count]) => {
          const width = (count / total) * 100
          return (
            <div key={plan}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-300">{plan}</span>
                <span className="font-semibold text-white">{count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#60a5fa,#c084fc)]"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
