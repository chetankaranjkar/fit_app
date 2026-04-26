import { useMemo, useRef } from 'react'
import { ModulePageShell } from '../components/ModulePageShell'
import {
  useCleaning,
  useEquipment,
  useExpenses,
  useMaintenance,
  useVendors,
} from '../hooks/useGymOperations'
import { useStaggerAnimation } from '../hooks/useStaggerAnimation'
import { formatINR, isThisMonth } from '../utils/format'

export function ReportsPage() {
  const { data: equipment = [] } = useEquipment()
  const { data: expenses = [] } = useExpenses()
  const { data: maintenance = [] } = useMaintenance()
  const { data: cleaning = [] } = useCleaning()
  const { data: vendors = [] } = useVendors()
  const gridRef = useRef<HTMLDivElement>(null)

  const metrics = useMemo(() => {
    const equipmentTotal = equipment.length
    const equipmentOutOfOrder = equipment.filter((e) => e.status === 'OUT_OF_ORDER').length
    const serviceDueSoon = equipment.filter((e) => {
      if (!e.nextServiceDate) return false
      const diff = (new Date(e.nextServiceDate).getTime() - Date.now()) / 86400000
      return diff <= 7
    }).length

    const monthlyExpense = expenses
      .filter((e) => isThisMonth(e.incurredAt))
      .reduce((a, b) => a + b.amount, 0)
    const pendingExpense = expenses
      .filter((e) => e.status === 'PENDING')
      .reduce((a, b) => a + b.amount, 0)

    const maintenanceThisMonth = maintenance.filter((l) =>
      isThisMonth(l.performedAt),
    ).length
    const repairsThisMonth = maintenance.filter(
      (l) => l.type === 'REPAIR' && isThisMonth(l.performedAt),
    ).length

    const highMaintenanceCount = (() => {
      const counts = new Map<string, number>()
      maintenance.forEach((m) => {
        counts.set(m.equipmentId, (counts.get(m.equipmentId) ?? 0) + 1)
      })
      return Array.from(counts.values()).filter((c) => c >= 2).length
    })()

    const cleaningTotal = cleaning.reduce((a, log) => a + log.tasks.length, 0)
    const cleaningDone = cleaning.reduce(
      (a, log) => a + log.tasks.filter((t) => t.done).length,
      0,
    )
    const cleaningPercent =
      cleaningTotal === 0 ? 0 : Math.round((cleaningDone / cleaningTotal) * 100)

    const vendorsOnContract = vendors.filter((v) => v.onContract).length

    return {
      equipmentTotal,
      equipmentOutOfOrder,
      serviceDueSoon,
      monthlyExpense,
      pendingExpense,
      maintenanceThisMonth,
      repairsThisMonth,
      highMaintenanceCount,
      cleaningPercent,
      vendorsTotal: vendors.length,
      vendorsOnContract,
    }
  }, [equipment, expenses, maintenance, cleaning, vendors])

  useStaggerAnimation(gridRef, '[data-report-card]', [metrics])

  const reportCards: Array<{
    label: string
    value: string
    caption?: string
    gradient: string
    severity?: 'info' | 'warn' | 'danger'
  }> = [
    {
      label: 'Total equipment',
      value: `${metrics.equipmentTotal}`,
      caption: 'All inventory across zones',
      gradient: 'from-blue-500 to-purple-500',
    },
    {
      label: 'Out of order',
      value: `${metrics.equipmentOutOfOrder}`,
      caption: metrics.equipmentOutOfOrder > 0 ? 'Needs attention' : 'All units operational',
      gradient: 'from-rose-500 to-pink-500',
      severity: metrics.equipmentOutOfOrder > 0 ? 'danger' : 'info',
    },
    {
      label: 'Service due (≤7 days)',
      value: `${metrics.serviceDueSoon}`,
      caption: metrics.serviceDueSoon > 0 ? 'Schedule maintenance' : 'No upcoming services',
      gradient: 'from-amber-400 to-orange-500',
      severity: metrics.serviceDueSoon > 0 ? 'warn' : 'info',
    },
    {
      label: 'Monthly expenses',
      value: formatINR(metrics.monthlyExpense),
      caption: 'This calendar month',
      gradient: 'from-emerald-400 to-teal-500',
    },
    {
      label: 'Pending payments',
      value: formatINR(metrics.pendingExpense),
      caption: metrics.pendingExpense > 0 ? 'Settle with vendors' : 'Nothing pending',
      gradient: 'from-amber-400 to-orange-500',
      severity: metrics.pendingExpense > 0 ? 'warn' : 'info',
    },
    {
      label: 'Maintenance events',
      value: `${metrics.maintenanceThisMonth}`,
      caption: `${metrics.repairsThisMonth} repair${metrics.repairsThisMonth === 1 ? '' : 's'} this month`,
      gradient: 'from-cyan-400 to-blue-500',
    },
    {
      label: 'High-maintenance units',
      value: `${metrics.highMaintenanceCount}`,
      caption: '≥ 2 entries logged',
      gradient: 'from-fuchsia-500 to-pink-500',
    },
    {
      label: 'Today cleaning progress',
      value: `${metrics.cleaningPercent}%`,
      caption: 'Combined across shifts',
      gradient: 'from-sky-400 to-blue-500',
    },
    {
      label: 'Vendors on contract',
      value: `${metrics.vendorsOnContract} / ${metrics.vendorsTotal}`,
      caption: 'Active service agreements',
      gradient: 'from-blue-500 to-purple-500',
    },
  ]

  return (
    <ModulePageShell
      eyebrow="Gym Operations"
      titleGradient="Operations Reports"
      subtitle="Snapshot of your facility's operational health — equipment, cost, cleanliness, and partners."
    >
      <div
        ref={gridRef}
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {reportCards.map((card) => (
          <ReportCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5 px-5 py-4 text-xs text-blue-100">
        <p className="font-semibold text-blue-200">Powered by live module data</p>
        <p className="mt-1 text-blue-100/80">
          These reports are computed client-side from the Gym Operations module data. When
          the backend is wired in Phase 2, the same cards will continue to work without any
          UI changes.
        </p>
      </div>
    </ModulePageShell>
  )
}

function ReportCard({
  label,
  value,
  caption,
  gradient,
  severity = 'info',
}: {
  label: string
  value: string
  caption?: string
  gradient: string
  severity?: 'info' | 'warn' | 'danger'
}) {
  const borderCls =
    severity === 'danger'
      ? 'hover:border-rose-400/30'
      : severity === 'warn'
        ? 'hover:border-amber-400/30'
        : 'hover:border-white/20'

  return (
    <div
      data-report-card
      className={[
        'glass-card dashboard-card group relative overflow-hidden rounded-2xl p-5 transition-all duration-300',
        'hover:-translate-y-0.5 hover:scale-[1.02]',
        borderCls,
      ].join(' ')}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-opacity group-hover:opacity-30`}
      />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
      <div className={`mt-4 h-1 w-10 rounded-full bg-gradient-to-r ${gradient}`} />
    </div>
  )
}
