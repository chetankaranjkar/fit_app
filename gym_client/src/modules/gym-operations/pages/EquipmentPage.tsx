import { useMemo, useRef, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { DashboardMetricsGrid } from '../../../components/layout/DashboardMetricsGrid'
import { ModulePageShell } from '../components/ModulePageShell'
import { FilterBar } from '../components/FilterBar'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { ServiceAlertBadge } from '../components/ServiceAlertBadge'
import {
  useCreateEquipment,
  useDeleteEquipment,
  useEquipment,
  useUpdateEquipment,
} from '../hooks/useGymOperations'
import { useStaggerAnimation } from '../hooks/useStaggerAnimation'
import { daysUntil, formatDate, formatINR } from '../utils/format'
import type {
  Equipment,
  EquipmentCategory,
  EquipmentFilters,
  EquipmentStatus,
} from '../types'
import { DEFAULT_EQUIPMENT_FILTERS } from '../types'

// ---------------------------------------------------------------------------
// Filter / sort option lists
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: EquipmentFilters['status']; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'UNDER_MAINTENANCE', label: 'Maintenance' },
  { value: 'OUT_OF_ORDER', label: 'Out of order' },
  { value: 'RETIRED', label: 'Retired' },
]

const CATEGORY_OPTIONS: { value: EquipmentFilters['category']; label: string }[] = [
  { value: 'ALL', label: 'All categories' },
  { value: 'Cardio', label: 'Cardio' },
  { value: 'Strength', label: 'Strength' },
  { value: 'Functional', label: 'Functional' },
  { value: 'Accessory', label: 'Accessory' },
]

const STATUS_FORM_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'UNDER_MAINTENANCE', label: 'Under maintenance' },
  { value: 'OUT_OF_ORDER', label: 'Out of order' },
  { value: 'RETIRED', label: 'Retired' },
]

type SortKey = 'name' | 'category' | 'purchaseCost' | 'purchaseDate' | 'nextServiceDate'
type SortDir = 'asc' | 'desc'

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const ageYears = (iso: string): number => {
  const diff = Date.now() - new Date(iso).getTime()
  return Math.max(0, diff / (365.25 * 86400000))
}

const formatAge = (iso: string): string => {
  const y = ageYears(iso)
  if (y < 1 / 12) return 'new'
  if (y < 1) return `${Math.round(y * 12)} mo`
  return `${y.toFixed(1)} yrs`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function EquipmentPage() {
  const { data = [], isLoading } = useEquipment()
  const [filters, setFilters] = useState<EquipmentFilters>(DEFAULT_EQUIPMENT_FILTERS)
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'name',
    dir: 'asc',
  })
  const [formMode, setFormMode] = useState<{ kind: 'closed' } | { kind: 'add' } | { kind: 'edit'; equipment: Equipment }>(
    { kind: 'closed' },
  )
  const [detail, setDetail] = useState<Equipment | null>(null)
  const tableBodyRef = useRef<HTMLTableSectionElement>(null)

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    const list = data.filter((e) => {
      if (filters.status !== 'ALL' && e.status !== filters.status) return false
      if (filters.category !== 'ALL' && e.category !== filters.category) return false
      if (!q) return true
      return (
        e.name.toLowerCase().includes(q) ||
        (e.brand ?? '').toLowerCase().includes(q) ||
        (e.serialNumber ?? '').toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
      )
    })

    const sign = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sort.key) {
        case 'purchaseCost':
          return (a.purchaseCost - b.purchaseCost) * sign
        case 'purchaseDate':
          return (new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()) * sign
        case 'nextServiceDate': {
          const aN = a.nextServiceDate ? new Date(a.nextServiceDate).getTime() : Number.MAX_SAFE_INTEGER
          const bN = b.nextServiceDate ? new Date(b.nextServiceDate).getTime() : Number.MAX_SAFE_INTEGER
          return (aN - bN) * sign
        }
        case 'category':
          return a.category.localeCompare(b.category) * sign
        case 'name':
        default:
          return a.name.localeCompare(b.name) * sign
      }
    })
  }, [data, filters, sort])

  useStaggerAnimation(tableBodyRef, 'tr[data-row]', [filtered.length, isLoading])

  const filtersActive =
    filters.query.trim() !== '' || filters.status !== 'ALL' || filters.category !== 'ALL'

  return (
    <ModulePageShell
      eyebrow="Gym Operations"
      titleBefore="Manage "
      titleGradient="Equipment"
      subtitle="Track inventory, capital value, and upcoming service windows for every machine on the floor."
      primaryAction={{ label: '+ Add equipment', onClick: () => setFormMode({ kind: 'add' }) }}
    >
      <div className="mt-6 space-y-6">
        <KpiStrip data={data} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <CategoryBreakdown data={data} className="xl:col-span-2" />
          <ServiceQueueCard data={data} onView={(e) => setDetail(e)} />
        </div>

        <section className="glass-card dashboard-card min-w-0 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-5">
            <div>
              <h2 className="text-base font-semibold text-white">Inventory</h2>
              <p className="text-xs text-slate-400">
                {filtered.length} of {data.length} items shown
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportCsv(filtered)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-200"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                  />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          <FilterBar
            search={filters.query}
            onSearchChange={(v) => setFilters((f) => ({ ...f, query: v }))}
            selects={[
              {
                label: 'Status',
                value: filters.status,
                onChange: (v) =>
                  setFilters((f) => ({ ...f, status: v as EquipmentFilters['status'] })),
                options: STATUS_OPTIONS,
              },
              {
                label: 'Category',
                value: filters.category,
                onChange: (v) =>
                  setFilters((f) => ({ ...f, category: v as EquipmentFilters['category'] })),
                options: CATEGORY_OPTIONS,
              },
            ]}
            right={
              filtersActive && (
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_EQUIPMENT_FILTERS)}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  Clear
                </button>
              )
            }
          />

          {filtered.length === 0 && !isLoading ? (
            <EmptyState
              title="No equipment matches your filters"
              description="Try clearing filters or adding a new piece of equipment."
              action={
                <Button size="sm" onClick={() => setFormMode({ kind: 'add' })}>
                  + Add equipment
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                    <SortHeader
                      label="Equipment"
                      k="name"
                      sort={sort}
                      onSort={setSort}
                      className="px-6 py-3"
                    />
                    <SortHeader
                      label="Category"
                      k="category"
                      sort={sort}
                      onSort={setSort}
                      className="px-6 py-3"
                    />
                    <th className="px-6 py-3 font-semibold">Location</th>
                    <SortHeader
                      label="Age"
                      k="purchaseDate"
                      sort={sort}
                      onSort={setSort}
                      className="px-6 py-3"
                    />
                    <SortHeader
                      label="Value"
                      k="purchaseCost"
                      sort={sort}
                      onSort={setSort}
                      className="px-6 py-3"
                    />
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <SortHeader
                      label="Next service"
                      k="nextServiceDate"
                      sort={sort}
                      onSort={setSort}
                      className="px-6 py-3"
                    />
                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody ref={tableBodyRef} className="divide-y divide-white/5">
                  {filtered.map((e) => (
                    <EquipmentRow
                      key={e.id}
                      equipment={e}
                      onView={() => setDetail(e)}
                      onEdit={() => setFormMode({ kind: 'edit', equipment: e })}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 bg-white/[0.02]">
                    <td className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Showing {filtered.length}
                    </td>
                    <td colSpan={3} />
                    <td className="px-6 py-3 text-sm font-semibold text-white">
                      {formatINR(filtered.reduce((sum, e) => sum + e.purchaseCost, 0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>

      <EquipmentFormModal
        mode={formMode}
        onClose={() => setFormMode({ kind: 'closed' })}
      />
      <EquipmentDetailModal
        equipment={detail}
        onClose={() => setDetail(null)}
        onEdit={(e) => {
          setDetail(null)
          setFormMode({ kind: 'edit', equipment: e })
        }}
      />
    </ModulePageShell>
  )
}

// ---------------------------------------------------------------------------
// KPI strip (6 cards incl. total equipment cost — user asked for this)
// ---------------------------------------------------------------------------

function KpiStrip({ data }: { data: Equipment[] }) {
  const totals = useMemo(() => {
    const counts: Record<EquipmentStatus, number> = {
      OPERATIONAL: 0,
      UNDER_MAINTENANCE: 0,
      OUT_OF_ORDER: 0,
      RETIRED: 0,
    }
    let totalValue = 0
    let serviceAlerts = 0
    data.forEach((e) => {
      counts[e.status] += 1
      totalValue += e.purchaseCost
      const d = daysUntil(e.nextServiceDate)
      if (d !== null && d <= 7) serviceAlerts += 1
    })
    const active = data.length - counts.RETIRED
    const uptimePct = active > 0 ? Math.round((counts.OPERATIONAL / active) * 100) : 0
    return { counts, totalValue, serviceAlerts, uptimePct, active }
  }, [data])

  const cards: Array<{
    label: string
    value: string
    hint?: string
    gradient: string
    icon: React.ReactNode
    tone?: 'default' | 'warn' | 'danger' | 'success'
  }> = [
    {
      label: 'Total equipment',
      value: data.length.toString(),
      hint: `${totals.active} active · ${totals.counts.RETIRED} retired`,
      gradient: 'from-blue-500 to-purple-500',
      icon: <IconBox />,
    },
    {
      label: 'Total value',
      value: formatINR(totals.totalValue),
      hint: 'Capital invested in equipment',
      gradient: 'from-indigo-500 to-sky-500',
      icon: <IconRupee />,
      tone: 'default',
    },
    {
      label: 'Uptime',
      value: `${totals.uptimePct}%`,
      hint: `${totals.counts.OPERATIONAL} operational`,
      gradient: 'from-emerald-400 to-teal-500',
      icon: <IconHeart />,
      tone: 'success',
    },
    {
      label: 'Under maintenance',
      value: totals.counts.UNDER_MAINTENANCE.toString(),
      hint: 'Temporarily unavailable',
      gradient: 'from-amber-400 to-orange-500',
      icon: <IconWrench />,
      tone: 'warn',
    },
    {
      label: 'Out of order',
      value: totals.counts.OUT_OF_ORDER.toString(),
      hint: totals.counts.OUT_OF_ORDER > 0 ? 'Needs immediate action' : 'All clear',
      gradient: 'from-rose-500 to-pink-500',
      icon: <IconAlert />,
      tone: totals.counts.OUT_OF_ORDER > 0 ? 'danger' : 'success',
    },
    {
      label: 'Service alerts',
      value: totals.serviceAlerts.toString(),
      hint: 'Due within 7 days',
      gradient: 'from-orange-400 to-red-500',
      icon: <IconBell />,
      tone: totals.serviceAlerts > 0 ? 'warn' : 'default',
    },
  ]

  return (
    <DashboardMetricsGrid cols={6}>
      {cards.map((c) => (
        <div
          key={c.label}
          className="glass-card dashboard-card group h-full min-w-0 overflow-hidden rounded-2xl p-4 transition-all duration-300 sm:hover:-translate-y-0.5 sm:hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {c.label}
            </p>
            <span
              className={`flex size-7 items-center justify-center rounded-lg bg-gradient-to-br ${c.gradient} text-white/90 shadow-lg shadow-black/20 transition group-hover:scale-110`}
            >
              {c.icon}
            </span>
          </div>
          <p
            className={[
              'mt-2 break-words text-xl font-bold leading-tight sm:text-2xl',
              c.tone === 'danger'
                ? 'text-rose-300'
                : c.tone === 'warn'
                  ? 'text-amber-200'
                  : c.tone === 'success'
                    ? 'text-emerald-200'
                    : 'text-white',
            ].join(' ')}
            title={c.value}
          >
            {c.value}
          </p>
          {c.hint && <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{c.hint}</p>}
          <div className={`mt-3 h-1 w-10 rounded-full bg-gradient-to-r ${c.gradient}`} />
        </div>
      ))}
    </DashboardMetricsGrid>
  )
}

// ---------------------------------------------------------------------------
// Category breakdown — count + value per category
// ---------------------------------------------------------------------------

function CategoryBreakdown({ data, className = '' }: { data: Equipment[]; className?: string }) {
  const { rows, totalValue, totalCount } = useMemo(() => {
    const map = new Map<EquipmentCategory, { count: number; value: number }>()
    data.forEach((e) => {
      const prev = map.get(e.category) ?? { count: 0, value: 0 }
      map.set(e.category, {
        count: prev.count + 1,
        value: prev.value + e.purchaseCost,
      })
    })
    const tv = Array.from(map.values()).reduce((s, v) => s + v.value, 0)
    return {
      rows: Array.from(map.entries())
        .map(([category, agg]) => ({ category, ...agg }))
        .sort((a, b) => b.value - a.value),
      totalValue: tv,
      totalCount: data.length,
    }
  }, [data])

  const categoryGradient: Record<EquipmentCategory, string> = {
    Cardio: 'from-rose-400 to-orange-500',
    Strength: 'from-blue-500 to-indigo-500',
    Functional: 'from-emerald-400 to-teal-500',
    Accessory: 'from-purple-500 to-fuchsia-500',
  }

  return (
    <section className={`glass-card dashboard-card min-w-0 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Value by category</h3>
          <p className="text-[11px] text-slate-500">
            {totalCount} assets · {formatINR(totalValue)} total
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {rows.length} categories
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-center text-xs text-slate-500">No equipment yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => {
            const pct = totalValue > 0 ? Math.round((r.value / totalValue) * 100) : 0
            return (
              <li key={r.category}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200">{r.category}</span>
                    <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                      {r.count}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-white">{formatINR(r.value)}</span>
                    <span className="text-[10px] text-slate-500">{pct}%</span>
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${categoryGradient[r.category]} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Service queue — upcoming / overdue service requirements
// ---------------------------------------------------------------------------

function ServiceQueueCard({
  data,
  onView,
}: {
  data: Equipment[]
  onView: (e: Equipment) => void
}) {
  const queue = useMemo(() => {
    return data
      .filter((e) => !!e.nextServiceDate && e.status !== 'RETIRED')
      .map((e) => ({ e, days: daysUntil(e.nextServiceDate) ?? 9999 }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 5)
  }, [data])

  return (
    <section className="glass-card dashboard-card flex min-w-0 flex-col rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Upcoming service</h3>
          <p className="text-[11px] text-slate-500">Next 5 scheduled</p>
        </div>
        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
          Priority
        </span>
      </div>

      {queue.length === 0 ? (
        <p className="mt-auto pt-6 text-center text-xs text-slate-500">
          No upcoming service scheduled.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-white/5">
          {queue.map(({ e, days }) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onView(e)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-left transition hover:bg-white/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{e.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{e.location}</p>
                </div>
                <ServiceAlertBadge nextServiceDate={e.nextServiceDate} />
                <span className="text-[10px] text-slate-500">
                  {days < 0 ? `${Math.abs(days)}d late` : days === 0 ? 'today' : `${days}d`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Table row
// ---------------------------------------------------------------------------

function EquipmentRow({
  equipment,
  onView,
  onEdit,
}: {
  equipment: Equipment
  onView: () => void
  onEdit: () => void
}) {
  return (
    <tr data-row className="group transition hover:bg-white/[0.03]">
      <td className="px-6 py-4">
        <button
          type="button"
          onClick={onView}
          className="flex flex-col text-left"
        >
          <span className="text-sm font-semibold text-white transition group-hover:text-blue-200">
            {equipment.name}
          </span>
          <span className="text-[11px] text-slate-500">
            {equipment.brand ?? '—'}
            {equipment.serialNumber ? ` · ${equipment.serialNumber}` : ''}
          </span>
        </button>
      </td>
      <td className="px-6 py-4">
        <CategoryPill category={equipment.category} />
      </td>
      <td className="px-6 py-4 text-slate-300">{equipment.location}</td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-slate-200">{formatAge(equipment.purchaseDate)}</span>
          <span className="text-[11px] text-slate-500">{formatDate(equipment.purchaseDate)}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="font-semibold text-white">{formatINR(equipment.purchaseCost)}</span>
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={equipment.status} />
      </td>
      <td className="px-6 py-4">
        <ServiceAlertBadge nextServiceDate={equipment.nextServiceDate} />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <IconActionButton label="View details" onClick={onView}>
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </IconActionButton>
          <IconActionButton label="Edit" onClick={onEdit}>
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </IconActionButton>
        </div>
      </td>
    </tr>
  )
}

function CategoryPill({ category }: { category: EquipmentCategory }) {
  const tone: Record<EquipmentCategory, string> = {
    Cardio: 'bg-rose-500/10 text-rose-200 border-rose-400/20',
    Strength: 'bg-blue-500/10 text-blue-200 border-blue-400/20',
    Functional: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/20',
    Accessory: 'bg-purple-500/10 text-purple-200 border-purple-400/20',
  }
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${tone[category]}`}
    >
      {category}
    </span>
  )
}

function SortHeader({
  label,
  k,
  sort,
  onSort,
  className,
}: {
  label: string
  k: SortKey
  sort: { key: SortKey; dir: SortDir }
  onSort: (s: { key: SortKey; dir: SortDir }) => void
  className?: string
}) {
  const active = sort.key === k
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() =>
          onSort({ key: k, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })
        }
        className={[
          'inline-flex items-center gap-1 font-semibold uppercase tracking-wider transition',
          active ? 'text-blue-200' : 'text-slate-500 hover:text-slate-300',
        ].join(' ')}
      >
        {label}
        <span className={`text-[9px] ${active ? 'opacity-100' : 'opacity-30'}`}>
          {active && sort.dir === 'desc' ? '▼' : '▲'}
        </span>
      </button>
    </th>
  )
}

function IconActionButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-200"
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const IconBox = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)
const IconRupee = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h12M6 8h12M9 12h6a3 3 0 110 6H8l8 4" />
  </svg>
)
const IconHeart = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
    />
  </svg>
)
const IconWrench = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IconAlert = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.2 16a2 2 0 001.73 3z"
    />
  </svg>
)
const IconBell = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0"
    />
  </svg>
)

// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------

function EquipmentDetailModal({
  equipment,
  onClose,
  onEdit,
}: {
  equipment: Equipment | null
  onClose: () => void
  onEdit: (e: Equipment) => void
}) {
  const deleteMut = useDeleteEquipment()

  if (!equipment) {
    return (
      <Modal open={false} onClose={onClose} title="">
        <div />
      </Modal>
    )
  }

  const age = formatAge(equipment.purchaseDate)
  const serviceDays = daysUntil(equipment.nextServiceDate)

  const handleDelete = () => {
    if (!window.confirm(`Delete ${equipment.name}? This cannot be undone.`)) return
    deleteMut.mutate(equipment.id, {
      onSuccess: () => onClose(),
    })
  }

  return (
    <Modal open onClose={onClose} title="Equipment details" size="wide">
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {equipment.category}
            </p>
            <h3 className="mt-0.5 truncate text-xl font-bold text-white">
              {equipment.name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {equipment.brand ?? 'No brand'}
              {equipment.serialNumber ? ` · SN ${equipment.serialNumber}` : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={equipment.status} />
            <ServiceAlertBadge nextServiceDate={equipment.nextServiceDate} />
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <DetailStat label="Location" value={equipment.location} />
          <DetailStat label="Age" value={age} />
          <DetailStat label="Purchased" value={formatDate(equipment.purchaseDate)} />
          <DetailStat
            label="Value"
            value={formatINR(equipment.purchaseCost)}
            accent
          />
          <DetailStat
            label="Next service"
            value={
              equipment.nextServiceDate
                ? `${formatDate(equipment.nextServiceDate)}${
                    serviceDays !== null
                      ? ` · ${serviceDays < 0 ? `${Math.abs(serviceDays)}d overdue` : `${serviceDays}d`}`
                      : ''
                  }`
                : '—'
            }
          />
          <DetailStat label="Serial" value={equipment.serialNumber ?? '—'} />
          <DetailStat label="Brand" value={equipment.brand ?? '—'} />
          <DetailStat label="Status" value={equipment.status.replace('_', ' ')} />
        </div>

        {equipment.notes && (
          <section>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Notes
            </h4>
            <p className="mt-1 whitespace-pre-wrap rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-300">
              {equipment.notes}
            </p>
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleDelete}
          >
            {deleteMut.isPending ? 'Deleting…' : 'Delete'}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" type="button" onClick={() => onEdit(equipment)}>
              Edit
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  )
}

function DetailStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={[
          'mt-1 truncate text-sm font-semibold',
          accent ? 'text-blue-200' : 'text-white',
        ].join(' ')}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add / edit modal — full field set
// ---------------------------------------------------------------------------

function EquipmentFormModal({
  mode,
  onClose,
}: {
  mode: { kind: 'closed' } | { kind: 'add' } | { kind: 'edit'; equipment: Equipment }
  onClose: () => void
}) {
  const createMut = useCreateEquipment()
  const updateMut = useUpdateEquipment()
  const editing = mode.kind === 'edit' ? mode.equipment : null
  const open = mode.kind !== 'closed'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${editing.name}` : 'Add equipment'}
      size="wide"
      scrollable
    >
      {open && (
        <EquipmentForm
          key={editing?.id ?? 'new'}
          equipment={editing}
          submitting={createMut.isPending || updateMut.isPending}
          submitError={createMut.error || updateMut.error}
          onCancel={onClose}
          onSubmit={(input) => {
            if (editing) {
              updateMut.mutate(
                { id: editing.id, input },
                { onSuccess: onClose },
              )
            } else {
              createMut.mutate(input, { onSuccess: onClose })
            }
          }}
        />
      )}
    </Modal>
  )
}

function EquipmentForm({
  equipment,
  onSubmit,
  onCancel,
  submitting,
  submitError,
}: {
  equipment: Equipment | null
  onSubmit: (input: {
    name: string
    category: string
    brand?: string
    serialNumber?: string
    location: string
    purchaseDate: string
    purchaseCost: number
    status: string
    nextServiceDate?: string
    notes?: string
  }) => void
  onCancel: () => void
  submitting: boolean
  submitError: unknown
}) {
  const today = new Date().toISOString().slice(0, 10)
  const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '')

  const [name, setName] = useState(equipment?.name ?? '')
  const [category, setCategory] = useState<EquipmentCategory>(
    equipment?.category ?? 'Cardio',
  )
  const [brand, setBrand] = useState(equipment?.brand ?? '')
  const [serialNumber, setSerialNumber] = useState(equipment?.serialNumber ?? '')
  const [location, setLocation] = useState(equipment?.location ?? '')
  const [purchaseDate, setPurchaseDate] = useState(
    toDateInput(equipment?.purchaseDate) || today,
  )
  const [purchaseCost, setPurchaseCost] = useState<string>(
    equipment ? String(equipment.purchaseCost) : '',
  )
  const [status, setStatus] = useState<EquipmentStatus>(
    equipment?.status ?? 'OPERATIONAL',
  )
  const [nextServiceDate, setNextServiceDate] = useState(
    toDateInput(equipment?.nextServiceDate),
  )
  const [notes, setNotes] = useState(equipment?.notes ?? '')

  const cost = Number(purchaseCost)
  const valid =
    name.trim() &&
    location.trim() &&
    purchaseDate &&
    purchaseCost !== '' &&
    !Number.isNaN(cost) &&
    cost >= 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onSubmit({
      name: name.trim(),
      category,
      brand: brand.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      location: location.trim(),
      purchaseDate: new Date(purchaseDate).toISOString(),
      purchaseCost: cost,
      status,
      nextServiceDate: nextServiceDate
        ? new Date(nextServiceDate).toISOString()
        : undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <LabeledInput
          label="Equipment name"
          value={name}
          onChange={setName}
          required
          placeholder="e.g. Treadmill X7"
        />
        <LabeledSelect
          label="Category"
          value={category}
          onChange={(v) => setCategory(v as EquipmentCategory)}
          options={[
            { value: 'Cardio', label: 'Cardio' },
            { value: 'Strength', label: 'Strength' },
            { value: 'Functional', label: 'Functional' },
            { value: 'Accessory', label: 'Accessory' },
          ]}
        />
        <LabeledInput label="Brand" value={brand} onChange={setBrand} placeholder="PulseRun" />
        <LabeledInput
          label="Serial number"
          value={serialNumber}
          onChange={setSerialNumber}
          placeholder="PR-TRX7-0001"
        />
        <LabeledInput
          label="Location"
          value={location}
          onChange={setLocation}
          required
          placeholder="Cardio Zone"
        />
        <LabeledSelect
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as EquipmentStatus)}
          options={STATUS_FORM_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <LabeledDate
          label="Purchase date"
          value={purchaseDate}
          onChange={setPurchaseDate}
          required
          max={today}
        />
        <LabeledInput
          label="Purchase cost (INR)"
          value={purchaseCost}
          onChange={(v) => setPurchaseCost(v.replace(/[^\d.]/g, ''))}
          required
          placeholder="e.g. 185000"
          inputMode="decimal"
        />
        <LabeledDate
          label="Next service date"
          value={nextServiceDate}
          onChange={setNextServiceDate}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-300">
          Notes / maintenance memo
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any known issues, warranty contact, accessories included…"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
        />
      </div>

      {!!submitError && (
        <p className="rounded-lg border border-rose-400/20 bg-rose-500/10 p-2 text-[11px] text-rose-200">
          Could not save to the server. Check your connection — the list will still update locally.
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!valid || submitting}>
          {submitting ? 'Saving…' : equipment ? 'Save changes' : 'Add equipment'}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Form field primitives
// ---------------------------------------------------------------------------

function LabeledInput({
  label,
  value,
  onChange,
  required,
  placeholder,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-300">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
      />
    </div>
  )
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-slate-900">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function LabeledDate({
  label,
  value,
  onChange,
  required,
  max,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  max?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-300">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        max={max}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function exportCsv(rows: Equipment[]) {
  const header = [
    'Name',
    'Category',
    'Brand',
    'Serial',
    'Location',
    'Purchase date',
    'Purchase cost (INR)',
    'Status',
    'Next service',
    'Notes',
  ]
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    header.join(','),
    ...rows.map((e) =>
      [
        e.name,
        e.category,
        e.brand ?? '',
        e.serialNumber ?? '',
        e.location,
        e.purchaseDate.slice(0, 10),
        e.purchaseCost,
        e.status,
        e.nextServiceDate ? e.nextServiceDate.slice(0, 10) : '',
        e.notes ?? '',
      ]
        .map(escape)
        .join(','),
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `equipment-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
