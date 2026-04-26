import { useMemo, useRef, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { ModulePageShell } from '../components/ModulePageShell'
import { FilterBar } from '../components/FilterBar'
import { EmptyState } from '../components/EmptyState'
import {
  LabeledDate,
  LabeledSelect,
  LabeledTextarea,
} from '../components/FormFields'
import { SkeletonKpiRow, SkeletonTable } from '../components/Skeletons'
import { CountUp } from '../components/CountUp'
import { IconWrench } from '../components/Icons'
import {
  useCreateMaintenance,
  useLockers,
  useMaintenance,
  useUpdateMaintenanceStatus,
} from '../hooks/useLockerManagement'
import { useStaggerAnimation } from '../hooks/useAnimations'
import { formatDate } from '../utils/format'
import {
  DEFAULT_MAINTENANCE_FILTERS,
  type Locker,
  type LockerMaintenance,
  type MaintenanceFilters,
  type MaintenanceStatus,
} from '../types'

const STATUS_FILTER_OPTIONS: { value: MaintenanceFilters['status']; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending only' },
  { value: 'FIXED', label: 'Fixed only' },
]

export function LockerMaintenancePage() {
  const { data = [], isLoading, isError } = useMaintenance()
  const { data: lockers = [] } = useLockers()
  const [filters, setFilters] = useState<MaintenanceFilters>(DEFAULT_MAINTENANCE_FILTERS)
  const [addOpen, setAddOpen] = useState(false)
  const bodyRef = useRef<HTMLTableSectionElement>(null)

  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime(),
      ),
    [data],
  )

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return sorted.filter((m) => {
      if (filters.status !== 'ALL' && m.status !== filters.status) return false
      if (!q) return true
      return (
        m.lockerNumber.toLowerCase().includes(q) ||
        m.issue.toLowerCase().includes(q)
      )
    })
  }, [sorted, filters])

  useStaggerAnimation(bodyRef, 'tr[data-row]', [filtered.length, isLoading])

  const pendingCount = useMemo(
    () => data.filter((m) => m.status === 'PENDING').length,
    [data],
  )

  const filtersActive = filters.query.trim() !== '' || filters.status !== 'ALL'

  const showSkeleton = isLoading && data.length === 0

  return (
    <ModulePageShell
      eyebrow="Locker Management"
      titleBefore="Locker "
      titleGradient="Maintenance"
      subtitle="Log and resolve locker issues before they become member complaints."
      primaryAction={{ label: '+ Report issue', onClick: () => setAddOpen(true) }}
    >
      <div className="mt-6 space-y-6">
        {showSkeleton ? (
          <SkeletonKpiRow count={3} />
        ) : (
          <SummaryStrip
            total={data.length}
            pending={pendingCount}
            fixed={data.length - pendingCount}
          />
        )}

        <section className="glass-card dashboard-card min-w-0 rounded-2xl">
          <div className="border-b border-white/5 px-6 py-5">
            <h2 className="text-base font-semibold text-white">Maintenance log</h2>
            <p className="text-xs text-slate-400">
              {filtered.length} of {sorted.length} entries
            </p>
          </div>

          <FilterBar
            search={filters.query}
            placeholder="Search by locker or issue\u2026"
            onSearchChange={(v) => setFilters((f) => ({ ...f, query: v }))}
            selects={[
              {
                label: 'Status',
                value: filters.status,
                onChange: (v) =>
                  setFilters((f) => ({ ...f, status: v as MaintenanceFilters['status'] })),
                options: STATUS_FILTER_OPTIONS,
              },
            ]}
            right={
              filtersActive && (
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_MAINTENANCE_FILTERS)}
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
              title="No maintenance tickets"
              description="All lockers are in good shape. Create a new ticket if an issue comes up."
              icon={<IconWrench className="size-5" />}
              action={
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  + Report issue
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3 font-semibold">Locker</th>
                    <th className="px-6 py-3 font-semibold">Issue</th>
                    <th className="px-6 py-3 font-semibold">Reported</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody ref={bodyRef} className="divide-y divide-white/5">
                  {filtered.map((m) => (
                    <MaintenanceRow key={m.id} entry={m} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ReportIssueModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        lockers={lockers}
      />
    </ModulePageShell>
  )
}

function MaintenanceRow({ entry }: { entry: LockerMaintenance }) {
  const updateMut = useUpdateMaintenanceStatus()
  const toggle = () => {
    const next: MaintenanceStatus = entry.status === 'PENDING' ? 'FIXED' : 'PENDING'
    updateMut.mutate({ id: entry.id, status: next })
  }
  return (
    <tr data-row className="transition hover:bg-white/[0.04]">
      <td className="px-6 py-4 text-slate-200">{entry.lockerNumber}</td>
      <td className="px-6 py-4 text-slate-300">{entry.issue}</td>
      <td className="px-6 py-4 text-slate-300">{formatDate(entry.reportedDate)}</td>
      <td className="px-6 py-4">
        <StatusPill status={entry.status} />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={toggle}
            disabled={updateMut.isPending}
            className={[
              'rounded-lg border px-2.5 py-1 text-[11px] transition',
              entry.status === 'PENDING'
                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                : 'border-white/10 bg-white/5 text-slate-300 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-200',
            ].join(' ')}
          >
            {updateMut.isPending
              ? 'Updating\u2026'
              : entry.status === 'PENDING'
                ? 'Mark fixed'
                : 'Reopen'}
          </button>
        </div>
      </td>
    </tr>
  )
}

function StatusPill({ status }: { status: MaintenanceStatus }) {
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
        <span className="relative inline-block size-1.5 rounded-full bg-amber-400">
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-60"
          />
        </span>
        Pending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
      <span className="size-1.5 rounded-full bg-emerald-400" />
      Fixed
    </span>
  )
}

function SummaryStrip({
  total,
  pending,
  fixed,
}: {
  total: number
  pending: number
  fixed: number
}) {
  const cards = [
    { label: 'Total reports', value: total, gradient: 'from-blue-500 to-purple-500' },
    { label: 'Pending', value: pending, gradient: 'from-amber-400 to-orange-500' },
    { label: 'Fixed', value: fixed, gradient: 'from-emerald-400 to-teal-500' },
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

// ---------------------------------------------------------------------------
// Report issue modal
// ---------------------------------------------------------------------------

function ReportIssueModal({
  open,
  onClose,
  lockers,
}: {
  open: boolean
  onClose: () => void
  lockers: Locker[]
}) {
  const createMut = useCreateMaintenance()
  const today = new Date().toISOString().slice(0, 10)
  const [lockerId, setLockerId] = useState<string>(lockers[0]?.id ?? '')
  const [issue, setIssue] = useState('')
  const [reportedDate, setReportedDate] = useState(today)
  const [status, setStatus] = useState<MaintenanceStatus>('PENDING')

  const selected = lockers.find((l) => l.id === lockerId)
  const valid = !!selected && issue.trim() !== '' && reportedDate !== ''

  const reset = () => {
    setLockerId(lockers[0]?.id ?? '')
    setIssue('')
    setReportedDate(today)
    setStatus('PENDING')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || !selected) return
    createMut.mutate(
      {
        input: {
          lockerId: selected.id,
          issue: issue.trim(),
          reportedDate: new Date(reportedDate).toISOString(),
          status,
        },
        lockerNumber: selected.lockerNumber,
      },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Report locker issue">
      <form onSubmit={handleSubmit} className="space-y-4">
        {lockers.length === 0 ? (
          <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-200">
            Add a locker first to create a maintenance ticket.
          </p>
        ) : (
          <LabeledSelect
            label="Locker"
            value={lockerId}
            onChange={setLockerId}
            options={lockers.map((l) => ({
              value: l.id,
              label: `${l.lockerNumber} (${l.size}${l.location ? ` \u00b7 ${l.location}` : ''})`,
            }))}
          />
        )}
        <LabeledTextarea
          label="Issue description"
          value={issue}
          onChange={setIssue}
          required
          placeholder="e.g. Door latch not closing properly."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <LabeledDate
            label="Reported date"
            value={reportedDate}
            onChange={setReportedDate}
            required
          />
          <LabeledSelect
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as MaintenanceStatus)}
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'FIXED', label: 'Fixed' },
            ]}
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!valid || createMut.isPending}>
            {createMut.isPending ? 'Saving\u2026' : 'Log maintenance'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
