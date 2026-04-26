import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { ModulePageShell } from '../components/ModulePageShell'
import { LockerStatusBadge } from '../components/LockerStatusBadge'
import { CountUp } from '../components/CountUp'
import { CircularProgress } from '../components/CircularProgress'
import { SkeletonCard, SkeletonKpiRow } from '../components/Skeletons'
import {
  IconAlert,
  IconBolt,
  IconCheck,
  IconLocker,
  IconUser,
  IconWrench,
} from '../components/Icons'
import {
  useAssignments,
  useLockers,
  useMaintenance,
} from '../hooks/useLockerManagement'
import { formatDate, isExpired } from '../utils/format'
import type { Locker, LockerStatus } from '../types'

export function LockerReportsPage() {
  const { data: lockers = [], isLoading: lockersLoading } = useLockers()
  const { data: assignments = [] } = useAssignments()
  const { data: maintenance = [] } = useMaintenance()

  const kpi = useMemo(() => {
    const counts: Record<LockerStatus, number> = {
      AVAILABLE: 0,
      OCCUPIED: 0,
      MAINTENANCE: 0,
    }
    lockers.forEach((l) => {
      counts[l.status] += 1
    })
    const occupancy = lockers.length > 0 ? Math.round((counts.OCCUPIED / lockers.length) * 100) : 0
    const expiredAssignments = assignments.filter((a) => isExpired(a.expiryDate)).length
    const pendingMaintenance = maintenance.filter((m) => m.status === 'PENDING').length
    return {
      total: lockers.length,
      occupied: counts.OCCUPIED,
      available: counts.AVAILABLE,
      maintenance: counts.MAINTENANCE,
      occupancy,
      expiredAssignments,
      pendingMaintenance,
    }
  }, [lockers, assignments, maintenance])

  const unavailable = useMemo(
    () => lockers.filter((l) => l.status === 'MAINTENANCE'),
    [lockers],
  )

  const showSkeleton = lockersLoading && lockers.length === 0

  return (
    <ModulePageShell
      eyebrow="Locker Management"
      titleBefore="Locker "
      titleGradient="Reports"
      subtitle="Live occupancy, assignment health, and maintenance pipeline at a glance."
    >
      <div className="mt-6 space-y-6">
        {/* Primary KPIs */}
        {showSkeleton ? (
          <SkeletonKpiRow count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              label="Total lockers"
              value={kpi.total}
              hint="All bays & zones"
              gradient="from-blue-500 to-purple-500"
              icon={<IconLocker className="size-4" />}
            />
            <KpiCard
              label="Occupied"
              value={kpi.occupied}
              hint={`${kpi.occupancy}% occupancy`}
              gradient="from-blue-400 to-indigo-500"
              icon={<IconUser className="size-4" />}
            />
            <KpiCard
              label="Available"
              value={kpi.available}
              hint="Ready to assign"
              gradient="from-emerald-400 to-teal-500"
              icon={<IconCheck className="size-4" />}
              tone="success"
            />
            <KpiCard
              label="Maintenance"
              value={kpi.maintenance}
              hint={
                kpi.pendingMaintenance > 0
                  ? `${kpi.pendingMaintenance} open ticket${kpi.pendingMaintenance === 1 ? '' : 's'}`
                  : 'No open tickets'
              }
              gradient="from-amber-400 to-orange-500"
              icon={<IconWrench className="size-4" />}
              tone={kpi.maintenance > 0 ? 'warn' : 'default'}
            />
          </div>
        )}

        {/* Occupancy + Health */}
        {showSkeleton ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SkeletonCard className="xl:col-span-2 h-48" />
            <SkeletonCard className="h-48" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <OccupancyCard
              occupancy={kpi.occupancy}
              occupied={kpi.occupied}
              available={kpi.available}
              maintenance={kpi.maintenance}
              total={kpi.total}
              className="xl:col-span-2"
            />
            <HealthCard
              expiredAssignments={kpi.expiredAssignments}
              pendingMaintenance={kpi.pendingMaintenance}
            />
          </div>
        )}

        {/* Currently unavailable lockers */}
        <section className="glass-card dashboard-card min-w-0 rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
            <div>
              <h2 className="text-base font-semibold text-white">Currently unavailable</h2>
              <p className="text-xs text-slate-400">Lockers out of circulation for maintenance</p>
            </div>
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              {unavailable.length}
            </span>
          </div>

          {unavailable.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-400">
              All lockers are in service. No maintenance blocks.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {unavailable.map((l) => (
                <UnavailableRow key={l.id} locker={l} />
              ))}
            </ul>
          )}
        </section>

        {/* Recently expired assignments */}
        <RecentExpiredSection />
      </div>
    </ModulePageShell>
  )
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  hint,
  gradient,
  icon,
  tone = 'default',
}: {
  label: string
  value: number
  hint?: string
  gradient: string
  icon: React.ReactNode
  tone?: 'default' | 'warn' | 'success'
}) {
  return (
    <div className="glass-card dashboard-card group min-w-0 overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/30">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <span
          className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white/90 shadow-lg shadow-black/20 transition group-hover:scale-110`}
        >
          {icon}
        </span>
      </div>
      <p
        className={[
          'mt-2 truncate text-3xl font-bold tracking-tight',
          tone === 'warn'
            ? 'text-amber-200'
            : tone === 'success'
              ? 'text-emerald-200'
              : 'text-white',
        ].join(' ')}
      >
        <CountUp value={value} />
      </p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-slate-500">{hint}</p>}
      <div className={`mt-3 h-1 w-10 rounded-full bg-gradient-to-r ${gradient}`} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Occupancy visual (ring + stacked bar)
// ---------------------------------------------------------------------------

function OccupancyCard({
  occupancy,
  occupied,
  available,
  maintenance,
  total,
  className = '',
}: {
  occupancy: number
  occupied: number
  available: number
  maintenance: number
  total: number
  className?: string
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const pct = Math.max(0, Math.min(100, occupancy))
  const occPct = total > 0 ? (occupied / total) * 100 : 0
  const availPct = total > 0 ? (available / total) * 100 : 0
  const maintPct = total > 0 ? (maintenance / total) * 100 : 0

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-seg]',
        { scaleX: 0, transformOrigin: 'left' },
        {
          scaleX: 1,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.08,
        },
      )
    }, el)
    return () => ctx.revert()
  }, [occPct, availPct, maintPct])

  return (
    <section
      className={`glass-card dashboard-card min-w-0 rounded-2xl p-5 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Occupancy overview</h3>
          <p className="text-[11px] text-slate-500">
            {occupied} of {total} lockers in active use
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/25 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-200">
          <IconBolt className="size-3" />
          Live
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
        <div className="flex shrink-0 items-center justify-center">
          <CircularProgress
            percent={pct}
            label={`${pct}%`}
            sublabel="Occupancy"
            size={168}
            strokeWidth={14}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Distribution</span>
              <span>{total} total</span>
            </div>
            <div
              ref={barRef}
              className="flex h-3 w-full overflow-hidden rounded-full bg-white/5"
            >
              <div
                data-seg
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                style={{ width: `${occPct}%` }}
                title={`${occupied} occupied`}
              />
              <div
                data-seg
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                style={{ width: `${availPct}%` }}
                title={`${available} available`}
              />
              <div
                data-seg
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                style={{ width: `${maintPct}%` }}
                title={`${maintenance} maintenance`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <LegendItem color="bg-blue-500" label="Occupied" value={occupied} pct={occPct} />
            <LegendItem color="bg-emerald-400" label="Available" value={available} pct={availPct} />
            <LegendItem color="bg-amber-400" label="Maintenance" value={maintenance} pct={maintPct} />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>0%</span>
            <span>Healthy range: 60\u201390%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function LegendItem({
  color,
  label,
  value,
  pct,
}: {
  color: string
  label: string
  value: number
  pct: number
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        <span className={`size-1.5 rounded-full ${color}`} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-base font-bold text-white">
          <CountUp value={value} />
        </span>
        <span className="text-[11px] text-slate-500">\u00b7 {Math.round(pct)}%</span>
      </div>
    </div>
  )
}

function HealthCard({
  expiredAssignments,
  pendingMaintenance,
}: {
  expiredAssignments: number
  pendingMaintenance: number
}) {
  const items = [
    {
      label: 'Expired assignments',
      value: expiredAssignments,
      tone: expiredAssignments > 0 ? 'danger' : 'ok',
      hint: 'Members past locker expiry date',
    },
    {
      label: 'Pending maintenance',
      value: pendingMaintenance,
      tone: pendingMaintenance > 0 ? 'warn' : 'ok',
      hint: 'Open tickets awaiting resolution',
    },
  ] as const
  return (
    <section className="glass-card dashboard-card min-w-0 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Alerts</h3>
          <p className="text-[11px] text-slate-500">Action items needing attention</p>
        </div>
        {(expiredAssignments > 0 || pendingMaintenance > 0) && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
            <IconAlert className="size-3" />
            Needs attention
          </span>
        )}
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li
            key={it.label}
            className={[
              'flex items-center justify-between rounded-xl border p-3 transition hover:-translate-y-0.5',
              it.tone === 'danger'
                ? 'border-rose-400/25 bg-rose-500/[0.05] hover:border-rose-400/40'
                : it.tone === 'warn'
                  ? 'border-amber-400/25 bg-amber-500/[0.05] hover:border-amber-400/40'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20',
            ].join(' ')}
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{it.label}</p>
              <p className="truncate text-[11px] text-slate-500">{it.hint}</p>
            </div>
            <span
              className={[
                'text-2xl font-bold tabular-nums',
                it.tone === 'danger'
                  ? 'text-rose-300'
                  : it.tone === 'warn'
                    ? 'text-amber-200'
                    : 'text-emerald-200',
              ].join(' ')}
            >
              <CountUp value={it.value} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function UnavailableRow({ locker }: { locker: Locker }) {
  return (
    <li className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-white/[0.03]">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{locker.lockerNumber}</p>
        <p className="truncate text-[11px] text-slate-500">
          {locker.size}
          {locker.location ? ` \u00b7 ${locker.location}` : ''}
        </p>
      </div>
      <LockerStatusBadge status={locker.status} />
    </li>
  )
}

function RecentExpiredSection() {
  const { data: assignments = [] } = useAssignments()
  const expired = useMemo(
    () =>
      assignments
        .filter((a) => isExpired(a.expiryDate))
        .sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime())
        .slice(0, 5),
    [assignments],
  )
  if (expired.length === 0) return null
  return (
    <section className="glass-card dashboard-card min-w-0 rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
        <div>
          <h2 className="text-base font-semibold text-white">Recent expiries</h2>
          <p className="text-xs text-slate-400">Latest 5 assignments past their expiry date</p>
        </div>
        <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
          {expired.length}
        </span>
      </div>
      <ul className="divide-y divide-white/5">
        {expired.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-white/[0.03]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{a.memberName}</p>
              <p className="truncate text-[11px] text-slate-500">Locker {a.lockerNumber}</p>
            </div>
            <span className="text-[11px] text-rose-300">expired {formatDate(a.expiryDate)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
