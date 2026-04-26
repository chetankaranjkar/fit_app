import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { ModulePageShell } from '../components/ModulePageShell'
import { FilterBar } from '../components/FilterBar'
import { EmptyState } from '../components/EmptyState'
import { LockerStatusBadge } from '../components/LockerStatusBadge'
import { LabeledInput, LabeledSelect } from '../components/FormFields'
import { LockerGridTile } from '../components/LockerGridTile'
import { LockerDetailPanel } from '../components/LockerDetailPanel'
import { ViewToggle } from '../components/ViewToggle'
import { SkeletonGrid, SkeletonKpiRow, SkeletonTable } from '../components/Skeletons'
import { CountUp } from '../components/CountUp'
import { IconEdit, IconGrid, IconList, IconTrash } from '../components/Icons'
import {
  useCreateLocker,
  useDeleteLocker,
  useLockers,
  useUpdateLocker,
} from '../hooks/useLockerManagement'
import { useStaggerAnimation } from '../hooks/useAnimations'
import {
  DEFAULT_LOCKER_FILTERS,
  type Locker,
  type LockerFilters,
  type LockerSize,
  type LockerStatus,
} from '../types'

const STATUS_FILTER_OPTIONS: { value: LockerFilters['status']; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
]

const SIZE_FILTER_OPTIONS: { value: LockerFilters['size']; label: string }[] = [
  { value: 'ALL', label: 'All sizes' },
  { value: 'Small', label: 'Small' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Large', label: 'Large' },
]

const SIZE_FORM_OPTIONS = [
  { value: 'Small', label: 'Small' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Large', label: 'Large' },
]

const STATUS_FORM_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
]

type View = 'grid' | 'table'
const VIEW_STORAGE_KEY = 'lkm:lockers:view'

export function LockersPage() {
  const { data = [], isLoading, isError, isFetching } = useLockers()
  const [filters, setFilters] = useState<LockerFilters>(DEFAULT_LOCKER_FILTERS)
  const [formMode, setFormMode] = useState<
    { kind: 'closed' } | { kind: 'add' } | { kind: 'edit'; locker: Locker }
  >({ kind: 'closed' })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<View>(() => {
    if (typeof window === 'undefined') return 'grid'
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
    return stored === 'table' ? 'table' : 'grid'
  })

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view)
  }, [view])

  const tableBodyRef = useRef<HTMLTableSectionElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return data.filter((l) => {
      if (filters.status !== 'ALL' && l.status !== filters.status) return false
      if (filters.size !== 'ALL' && l.size !== filters.size) return false
      if (!q) return true
      return (
        l.lockerNumber.toLowerCase().includes(q) ||
        (l.location ?? '').toLowerCase().includes(q)
      )
    })
  }, [data, filters])

  useStaggerAnimation(tableBodyRef, 'tr[data-row]', [filtered.length, isLoading, view])

  // Grid stagger — scoped GSAP context
  useEffect(() => {
    if (view !== 'grid') return
    const el = gridRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-tile]',
        { opacity: 0, y: 8, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.35,
          ease: 'power2.out',
          stagger: 0.03,
        },
      )
    }, el)
    return () => ctx.revert()
  }, [filtered.length, view])

  const filtersActive =
    filters.query.trim() !== '' || filters.status !== 'ALL' || filters.size !== 'ALL'

  // Derive the currently-selected locker from the latest data so edits /
  // status transitions reflect instantly in the side panel.
  const selected = useMemo(
    () => (selectedId ? data.find((l) => l.id === selectedId) ?? null : null),
    [data, selectedId],
  )

  const showSkeleton = isLoading && data.length === 0

  return (
    <ModulePageShell
      eyebrow="Locker Management"
      titleBefore="Manage "
      titleGradient="Lockers"
      subtitle="Track every locker on the floor \u2014 location, size, and live status."
      primaryAction={{ label: '+ Add locker', onClick: () => setFormMode({ kind: 'add' }) }}
    >
      <div className="mt-6 space-y-6">
        {showSkeleton ? <SkeletonKpiRow count={4} /> : <LockerSummaryStrip data={data} />}

        <section className="glass-card dashboard-card min-w-0 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-5">
            <div>
              <h2 className="text-base font-semibold text-white">All lockers</h2>
              <p className="text-xs text-slate-400">
                {filtered.length} of {data.length} shown
                {isFetching && !isLoading ? ' \u00b7 refreshing\u2026' : ''}
              </p>
            </div>
            <ViewToggle<View>
              value={view}
              onChange={setView}
              options={[
                { value: 'grid', label: 'Grid', icon: <IconGrid className="size-3.5" /> },
                { value: 'table', label: 'Table', icon: <IconList className="size-3.5" /> },
              ]}
            />
          </div>

          <FilterBar
            search={filters.query}
            placeholder="Search by number or location\u2026"
            onSearchChange={(v) => setFilters((f) => ({ ...f, query: v }))}
            selects={[
              {
                label: 'Status',
                value: filters.status,
                onChange: (v) =>
                  setFilters((f) => ({ ...f, status: v as LockerFilters['status'] })),
                options: STATUS_FILTER_OPTIONS,
              },
              {
                label: 'Size',
                value: filters.size,
                onChange: (v) =>
                  setFilters((f) => ({ ...f, size: v as LockerFilters['size'] })),
                options: SIZE_FILTER_OPTIONS,
              },
            ]}
            right={
              filtersActive && (
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_LOCKER_FILTERS)}
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
            view === 'grid' ? <SkeletonGrid tiles={12} /> : <SkeletonTable rows={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No lockers match your filters"
              description="Try clearing filters or add a new locker."
              action={
                <Button size="sm" onClick={() => setFormMode({ kind: 'add' })}>
                  + Add locker
                </Button>
              }
            />
          ) : view === 'grid' ? (
            <div
              ref={gridRef}
              className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 p-6"
            >
              {filtered.map((l) => (
                <LockerGridTile
                  key={l.id}
                  locker={l}
                  selected={selected?.id === l.id}
                  onClick={(locker) => setSelectedId(locker.id)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3 font-semibold">Locker #</th>
                    <th className="px-6 py-3 font-semibold">Size</th>
                    <th className="px-6 py-3 font-semibold">Location</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody ref={tableBodyRef} className="divide-y divide-white/5">
                  {filtered.map((l) => (
                    <LockerRow
                      key={l.id}
                      locker={l}
                      onOpen={() => setSelectedId(l.id)}
                      onEdit={() => setFormMode({ kind: 'edit', locker: l })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <LockerFormModal mode={formMode} onClose={() => setFormMode({ kind: 'closed' })} />

      <LockerDetailPanel
        locker={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(locker) => {
          setSelectedId(null)
          setFormMode({ kind: 'edit', locker })
        }}
      />
    </ModulePageShell>
  )
}

// ---------------------------------------------------------------------------
// Row / pills
// ---------------------------------------------------------------------------

function LockerRow({
  locker,
  onOpen,
  onEdit,
}: {
  locker: Locker
  onOpen: () => void
  onEdit: () => void
}) {
  const deleteMut = useDeleteLocker()
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Delete locker ${locker.lockerNumber}? This cannot be undone.`)) return
    deleteMut.mutate(locker.id)
  }
  return (
    <tr
      data-row
      onClick={onOpen}
      className="group cursor-pointer transition hover:bg-white/[0.04]"
    >
      <td className="px-6 py-4">
        <span className="text-sm font-semibold text-white">{locker.lockerNumber}</span>
      </td>
      <td className="px-6 py-4">
        <SizePill size={locker.size} />
      </td>
      <td className="px-6 py-4 text-slate-300">{locker.location ?? '\u2014'}</td>
      <td className="px-6 py-4">
        <LockerStatusBadge status={locker.status} />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <IconButton
            label="Edit"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <IconEdit className="size-3.5" />
          </IconButton>
          <IconButton label="Delete" onClick={handleDelete} tone="danger">
            <IconTrash className="size-3.5" />
          </IconButton>
        </div>
      </td>
    </tr>
  )
}

function SizePill({ size }: { size: LockerSize }) {
  const tone: Record<LockerSize, string> = {
    Small: 'bg-slate-500/10 text-slate-300 border-slate-400/20',
    Medium: 'bg-indigo-500/10 text-indigo-200 border-indigo-400/25',
    Large: 'bg-purple-500/10 text-purple-200 border-purple-400/25',
  }
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${tone[size]}`}
    >
      {size}
    </span>
  )
}

function IconButton({
  children,
  onClick,
  label,
  tone = 'default',
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  label: string
  tone?: 'default' | 'danger'
}) {
  const cls =
    tone === 'danger'
      ? 'border-white/10 bg-white/5 text-slate-300 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200'
      : 'border-white/10 bg-white/5 text-slate-300 hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-200'
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex size-7 items-center justify-center rounded-lg border transition active:scale-90 ${cls}`}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Summary strip \u2014 counts by status
// ---------------------------------------------------------------------------

function LockerSummaryStrip({ data }: { data: Locker[] }) {
  const counts = useMemo(() => {
    const c: Record<LockerStatus, number> = { AVAILABLE: 0, OCCUPIED: 0, MAINTENANCE: 0 }
    data.forEach((l) => {
      c[l.status] += 1
    })
    return c
  }, [data])

  const cards = [
    { label: 'Total lockers', value: data.length, gradient: 'from-blue-500 to-purple-500' },
    { label: 'Available', value: counts.AVAILABLE, gradient: 'from-emerald-400 to-teal-500' },
    { label: 'Occupied', value: counts.OCCUPIED, gradient: 'from-blue-400 to-indigo-500' },
    { label: 'Maintenance', value: counts.MAINTENANCE, gradient: 'from-amber-400 to-orange-500' },
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

// ---------------------------------------------------------------------------
// Add / edit modal
// ---------------------------------------------------------------------------

function LockerFormModal({
  mode,
  onClose,
}: {
  mode: { kind: 'closed' } | { kind: 'add' } | { kind: 'edit'; locker: Locker }
  onClose: () => void
}) {
  const createMut = useCreateLocker()
  const updateMut = useUpdateLocker()
  const editing = mode.kind === 'edit' ? mode.locker : null
  const open = mode.kind !== 'closed'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${editing.lockerNumber}` : 'Add locker'}
    >
      {open && (
        <LockerForm
          key={editing?.id ?? 'new'}
          locker={editing}
          submitting={createMut.isPending || updateMut.isPending}
          onCancel={onClose}
          onSubmit={(input) => {
            if (editing) {
              updateMut.mutate({ id: editing.id, input }, { onSuccess: onClose })
            } else {
              createMut.mutate(input, { onSuccess: onClose })
            }
          }}
        />
      )}
    </Modal>
  )
}

function LockerForm({
  locker,
  onSubmit,
  onCancel,
  submitting,
}: {
  locker: Locker | null
  onSubmit: (input: {
    lockerNumber: string
    size: LockerSize
    status: LockerStatus
    location?: string
  }) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [lockerNumber, setLockerNumber] = useState(locker?.lockerNumber ?? '')
  const [size, setSize] = useState<LockerSize>(locker?.size ?? 'Medium')
  const [status, setStatus] = useState<LockerStatus>(locker?.status ?? 'AVAILABLE')
  const [location, setLocation] = useState(locker?.location ?? '')

  const valid = lockerNumber.trim() !== ''

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onSubmit({
      lockerNumber: lockerNumber.trim(),
      size,
      status,
      location: location.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <LabeledInput
        label="Locker number"
        value={lockerNumber}
        onChange={setLockerNumber}
        required
        placeholder="e.g. A-101"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <LabeledSelect
          label="Size"
          value={size}
          onChange={(v) => setSize(v as LockerSize)}
          options={SIZE_FORM_OPTIONS}
        />
        <LabeledSelect
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as LockerStatus)}
          options={STATUS_FORM_OPTIONS}
        />
      </div>
      <LabeledInput
        label="Location"
        value={location}
        onChange={setLocation}
        placeholder="Men\u2019s Changing Room"
      />
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!valid || submitting}>
          {submitting ? 'Saving\u2026' : locker ? 'Save changes' : 'Add locker'}
        </Button>
      </div>
    </form>
  )
}
