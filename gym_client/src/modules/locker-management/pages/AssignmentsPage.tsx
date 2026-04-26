import { useMemo, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { ModulePageShell } from '../components/ModulePageShell'
import { FilterBar } from '../components/FilterBar'
import { EmptyState } from '../components/EmptyState'
import { AssignLockerWizard } from '../components/AssignLockerWizard'
import { SkeletonKpiRow, SkeletonTable } from '../components/Skeletons'
import { CountUp } from '../components/CountUp'
import { IconAlert, IconUser } from '../components/Icons'
import {
  useAssignments,
  useDeleteAssignment,
  useLockers,
} from '../hooks/useLockerManagement'
import { useStaggerAnimation } from '../hooks/useAnimations'
import { daysUntil, formatDate, isExpired } from '../utils/format'
import {
  DEFAULT_ASSIGNMENT_FILTERS,
  type AssignmentFilters,
  type LockerAssignment,
} from '../types'

const STATE_FILTER_OPTIONS: { value: AssignmentFilters['state']; label: string }[] = [
  { value: 'ALL', label: 'All assignments' },
  { value: 'ACTIVE', label: 'Active only' },
  { value: 'EXPIRED', label: 'Expired only' },
]

export function AssignmentsPage() {
  const { data: assignments = [], isLoading, isError } = useAssignments()
  const { data: lockers = [] } = useLockers()
  const [filters, setFilters] = useState<AssignmentFilters>(DEFAULT_ASSIGNMENT_FILTERS)
  const [addOpen, setAddOpen] = useState(false)
  const bodyRef = useRef<HTMLTableSectionElement>(null)

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return assignments.filter((a) => {
      const expired = isExpired(a.expiryDate)
      if (filters.state === 'ACTIVE' && expired) return false
      if (filters.state === 'EXPIRED' && !expired) return false
      if (!q) return true
      return (
        a.memberName.toLowerCase().includes(q) ||
        a.lockerNumber.toLowerCase().includes(q)
      )
    })
  }, [assignments, filters])

  useStaggerAnimation(bodyRef, 'tr[data-row]', [filtered.length, isLoading])

  const expiredCount = useMemo(
    () => assignments.filter((a) => isExpired(a.expiryDate)).length,
    [assignments],
  )

  const filtersActive = filters.query.trim() !== '' || filters.state !== 'ALL'

  const showSkeleton = isLoading && assignments.length === 0

  return (
    <ModulePageShell
      eyebrow="Locker Management"
      titleBefore="Locker "
      titleGradient="Assignments"
      subtitle="Assign lockers to members and keep tabs on expiring access."
      primaryAction={{ label: '+ Assign locker', onClick: () => setAddOpen(true) }}
    >
      <div className="mt-6 space-y-6">
        {showSkeleton ? (
          <SkeletonKpiRow count={3} />
        ) : (
          <SummaryStrip
            total={assignments.length}
            expired={expiredCount}
            active={assignments.length - expiredCount}
          />
        )}

        <section className="glass-card dashboard-card min-w-0 rounded-2xl">
          <div className="border-b border-white/5 px-6 py-5">
            <h2 className="text-base font-semibold text-white">All assignments</h2>
            <p className="text-xs text-slate-400">
              {filtered.length} of {assignments.length} shown
            </p>
          </div>

          <FilterBar
            search={filters.query}
            placeholder="Search by member or locker\u2026"
            onSearchChange={(v) => setFilters((f) => ({ ...f, query: v }))}
            selects={[
              {
                label: 'State',
                value: filters.state,
                onChange: (v) =>
                  setFilters((f) => ({ ...f, state: v as AssignmentFilters['state'] })),
                options: STATE_FILTER_OPTIONS,
              },
            ]}
            right={
              filtersActive && (
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_ASSIGNMENT_FILTERS)}
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
            <SkeletonTable rows={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No assignments yet"
              description="Assign a locker to a member to start tracking access."
              action={
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  + Assign locker
                </Button>
              }
              icon={<IconUser className="size-5" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3 font-semibold">Member</th>
                    <th className="px-6 py-3 font-semibold">Locker</th>
                    <th className="px-6 py-3 font-semibold">Assigned</th>
                    <th className="px-6 py-3 font-semibold">Expires</th>
                    <th className="px-6 py-3 font-semibold">State</th>
                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody ref={bodyRef} className="divide-y divide-white/5">
                  {filtered.map((a) => (
                    <AssignmentRow key={a.id} assignment={a} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AssignLockerWizard
        open={addOpen}
        onClose={() => setAddOpen(false)}
        availableLockers={lockers.filter((l) => l.status === 'AVAILABLE')}
      />
    </ModulePageShell>
  )
}

function AssignmentRow({ assignment }: { assignment: LockerAssignment }) {
  const expired = isExpired(assignment.expiryDate)
  const days = daysUntil(assignment.expiryDate)
  const deleteMut = useDeleteAssignment()

  const handleDelete = () => {
    if (!window.confirm(`Unassign ${assignment.memberName} from ${assignment.lockerNumber}?`)) return
    deleteMut.mutate(assignment.id)
  }

  const initials = assignment.memberName
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <tr
      data-row
      className={[
        'transition',
        expired
          ? 'bg-rose-500/[0.05] hover:bg-rose-500/[0.1]'
          : 'hover:bg-white/[0.04]',
      ].join(' ')}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-xs font-semibold text-white">
            {initials}
          </span>
          <span className="text-sm font-semibold text-white">{assignment.memberName}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-slate-200">{assignment.lockerNumber}</td>
      <td className="px-6 py-4 text-slate-300">{formatDate(assignment.assignedDate)}</td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className={expired ? 'text-rose-300' : 'text-slate-200'}>
            {formatDate(assignment.expiryDate)}
          </span>
          <span className="text-[11px] text-slate-500">
            {expired
              ? `${Math.abs(days)}d ago`
              : days === 0
                ? 'today'
                : `in ${days}d`}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        {expired ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-200">
            <span className="relative inline-block size-1.5 rounded-full bg-rose-400">
              <span
                aria-hidden
                className="absolute inset-0 animate-ping rounded-full bg-rose-400 opacity-75"
              />
            </span>
            <IconAlert className="size-3" />
            Expired
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition active:scale-95 hover:-translate-y-0.5 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
          >
            Unassign
          </button>
        </div>
      </td>
    </tr>
  )
}

function SummaryStrip({
  total,
  active,
  expired,
}: {
  total: number
  active: number
  expired: number
}) {
  const cards = [
    { label: 'Total assignments', value: total, gradient: 'from-blue-500 to-purple-500' },
    { label: 'Active', value: active, gradient: 'from-emerald-400 to-teal-500' },
    { label: 'Expired', value: expired, gradient: 'from-rose-500 to-pink-500' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
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
