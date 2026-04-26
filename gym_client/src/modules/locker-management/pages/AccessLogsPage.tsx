import { useEffect, useMemo, useRef, useState } from 'react'
import { ModulePageShell } from '../components/ModulePageShell'
import { FilterBar } from '../components/FilterBar'
import { EmptyState } from '../components/EmptyState'
import { AccessTimeline } from '../components/AccessTimeline'
import { ViewToggle } from '../components/ViewToggle'
import { SkeletonKpiRow, SkeletonTable, SkeletonTimeline } from '../components/Skeletons'
import { CountUp } from '../components/CountUp'
import { IconClock, IconList, IconLock, IconUnlock } from '../components/Icons'
import { useAccessLogs } from '../hooks/useLockerManagement'
import { useStaggerAnimation } from '../hooks/useAnimations'
import { formatDateTime } from '../utils/format'
import {
  DEFAULT_ACCESS_LOG_FILTERS,
  type AccessAction,
  type AccessLogFilters,
  type LockerAccessLog,
} from '../types'

const ACTION_FILTER_OPTIONS: { value: AccessLogFilters['action']; label: string }[] = [
  { value: 'ALL', label: 'All actions' },
  { value: 'OPEN', label: 'Open only' },
  { value: 'CLOSE', label: 'Close only' },
]

type View = 'timeline' | 'table'
const VIEW_STORAGE_KEY = 'lkm:accessLogs:view'

export function AccessLogsPage() {
  const { data = [], isLoading, isError, isFetching } = useAccessLogs()
  const [filters, setFilters] = useState<AccessLogFilters>(DEFAULT_ACCESS_LOG_FILTERS)
  const bodyRef = useRef<HTMLTableSectionElement>(null)

  const [view, setView] = useState<View>(() => {
    if (typeof window === 'undefined') return 'timeline'
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
    return stored === 'table' ? 'table' : 'timeline'
  })
  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view)
  }, [view])

  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) => new Date(b.accessTime).getTime() - new Date(a.accessTime).getTime(),
      ),
    [data],
  )

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return sorted.filter((l) => {
      if (filters.action !== 'ALL' && l.action !== filters.action) return false
      if (!q) return true
      return (
        l.memberName.toLowerCase().includes(q) ||
        l.lockerNumber.toLowerCase().includes(q)
      )
    })
  }, [sorted, filters])

  useStaggerAnimation(bodyRef, 'tr[data-row]', [filtered.length, isLoading, view])

  const filtersActive = filters.query.trim() !== '' || filters.action !== 'ALL'

  const todayCount = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return sorted.filter((l) => new Date(l.accessTime) >= start).length
  }, [sorted])

  const openCount = useMemo(() => sorted.filter((l) => l.action === 'OPEN').length, [sorted])
  const closeCount = useMemo(() => sorted.filter((l) => l.action === 'CLOSE').length, [sorted])

  const showSkeleton = isLoading && sorted.length === 0

  return (
    <ModulePageShell
      eyebrow="Locker Management"
      titleBefore="Access "
      titleGradient="Logs"
      subtitle="Audit trail of every locker interaction \u2014 who opened, who closed, and when."
    >
      <div className="mt-6 space-y-6">
        {showSkeleton ? (
          <SkeletonKpiRow count={4} />
        ) : (
          <SummaryStrip total={sorted.length} today={todayCount} opens={openCount} closes={closeCount} />
        )}

        <section className="glass-card dashboard-card min-w-0 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-5">
            <div>
              <h2 className="text-base font-semibold text-white">Latest activity</h2>
              <p className="text-xs text-slate-400">
                {filtered.length} of {sorted.length} entries
                {isFetching && !isLoading ? ' \u00b7 refreshing\u2026' : ''}
              </p>
            </div>
            <ViewToggle<View>
              value={view}
              onChange={setView}
              options={[
                { value: 'timeline', label: 'Timeline', icon: <IconClock className="size-3.5" /> },
                { value: 'table', label: 'Table', icon: <IconList className="size-3.5" /> },
              ]}
            />
          </div>

          <FilterBar
            search={filters.query}
            placeholder="Search by member or locker\u2026"
            onSearchChange={(v) => setFilters((f) => ({ ...f, query: v }))}
            selects={[
              {
                label: 'Action',
                value: filters.action,
                onChange: (v) =>
                  setFilters((f) => ({ ...f, action: v as AccessLogFilters['action'] })),
                options: ACTION_FILTER_OPTIONS,
              },
            ]}
            right={
              filtersActive && (
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_ACCESS_LOG_FILTERS)}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  Clear
                </button>
              )
            }
          />

          {isError && (
            <p className="px-6 py-3 text-xs text-amber-300">
              Live data unavailable \u2014 showing cached copy.
            </p>
          )}

          {showSkeleton ? (
            view === 'timeline' ? <SkeletonTimeline rows={6} /> : <SkeletonTable rows={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No access logs yet"
              description="Logs will appear here as members open and close lockers."
              icon={<IconClock className="size-5" />}
            />
          ) : view === 'timeline' ? (
            <AccessTimeline logs={filtered} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3 font-semibold">Time</th>
                    <th className="px-6 py-3 font-semibold">Member</th>
                    <th className="px-6 py-3 font-semibold">Locker</th>
                    <th className="px-6 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody ref={bodyRef} className="divide-y divide-white/5">
                  {filtered.map((l) => (
                    <LogRow key={l.id} log={l} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ModulePageShell>
  )
}

function LogRow({ log }: { log: LockerAccessLog }) {
  return (
    <tr data-row className="transition hover:bg-white/[0.04]">
      <td className="px-6 py-4 text-slate-300">{formatDateTime(log.accessTime)}</td>
      <td className="px-6 py-4">
        <span className="text-sm font-semibold text-white">{log.memberName}</span>
      </td>
      <td className="px-6 py-4 text-slate-200">{log.lockerNumber}</td>
      <td className="px-6 py-4">
        <ActionPill action={log.action} />
      </td>
    </tr>
  )
}

function ActionPill({ action }: { action: AccessAction }) {
  if (action === 'OPEN') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
        <IconUnlock className="size-3" />
        Open
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-400/25 bg-slate-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-200">
      <IconLock className="size-3" />
      Close
    </span>
  )
}

function SummaryStrip({
  total,
  today,
  opens,
  closes,
}: {
  total: number
  today: number
  opens: number
  closes: number
}) {
  const cards = [
    { label: 'Total logs', value: total, gradient: 'from-blue-500 to-purple-500' },
    { label: 'Today', value: today, gradient: 'from-emerald-400 to-teal-500' },
    { label: 'Opens', value: opens, gradient: 'from-emerald-400 to-green-500' },
    { label: 'Closes', value: closes, gradient: 'from-slate-400 to-slate-500' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="glass-card dashboard-card min-w-0 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {c.label}
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            <CountUp value={c.value} />
          </p>
          <div className={`mt-3 h-1 w-10 rounded-full bg-gradient-to-r ${c.gradient}`} />
        </div>
      ))}
    </div>
  )
}
