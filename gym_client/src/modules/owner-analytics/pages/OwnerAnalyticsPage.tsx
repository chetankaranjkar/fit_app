import { useMemo, useRef, useState } from 'react'
import { ModulePageShell } from '../components/ModulePageShell'
import { KpiCard } from '../components/KpiCard'
import { CountUp } from '../components/CountUp'
import {
  IconActivity,
  IconAlert,
  IconRupee,
  IconUsers,
  IconWrench,
} from '../components/Icons'
import { AnalyticsDrawer } from '../components/AnalyticsDrawer'
import {
  RevenueDrawerBody,
  RevenueDrawerSummary,
} from '../components/drawers/RevenueDrawer'
import {
  MembersDrawerBody,
  MembersDrawerSummary,
} from '../components/drawers/MembersDrawer'
import {
  PaymentsDrawerBody,
  PaymentsDrawerSummary,
} from '../components/drawers/PaymentsDrawer'
import {
  EquipmentDrawerBody,
  EquipmentDrawerSummary,
} from '../components/drawers/EquipmentDrawer'
import { KPI_SNAPSHOT } from '../services/mockData'
import { useStaggerAnimation } from '../hooks/useAnimations'
import {
  AttentionPanel,
  MemberPulseCard,
  RecentActivityCard,
  RevenueOverviewCard,
} from '../components/OverviewPanels'
import type { KpiType } from '../types'

const inr = (n: number) => `\u20b9${n.toLocaleString('en-IN')}`

type DrawerConfig = {
  title: string
  subtitle: string
  summary: React.ReactNode
  body: React.ReactNode
}

export function OwnerAnalyticsPage() {
  const [open, setOpen] = useState<KpiType | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const drawers = useMemo<Record<KpiType, DrawerConfig>>(
    () => ({
      revenue: {
        title: 'Revenue insights',
        subtitle: 'Breakdown, trend and recent payments',
        summary: <RevenueDrawerSummary />,
        body: <RevenueDrawerBody />,
      },
      members: {
        title: 'Active members',
        subtitle: 'Engagement snapshot and attendance',
        summary: <MembersDrawerSummary />,
        body: <MembersDrawerBody />,
      },
      payments: {
        title: 'Pending payments',
        subtitle: 'Dues and reminders',
        summary: <PaymentsDrawerSummary />,
        body: <PaymentsDrawerBody />,
      },
      equipment: {
        title: 'Equipment downtime',
        subtitle: 'Issues affecting availability',
        summary: <EquipmentDrawerSummary />,
        body: <EquipmentDrawerBody />,
      },
    }),
    [],
  )

  useStaggerAnimation(gridRef, '[data-kpi]', [])

  const current = open ? drawers[open] : null

  return (
    <ModulePageShell
      eyebrow="Owner Analytics"
      titleBefore="Your gym, at a "
      titleGradient="glance"
      subtitle="Click any KPI to drill into contextual detail without leaving the page."
    >
      <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          type="revenue"
          label="Total Revenue (30d)"
          value={<CountUp value={KPI_SNAPSHOT.revenue.total30d} format={inr} />}
          subValue={
            <>
              Last 7 days&nbsp;
              <span className="font-semibold text-slate-300">
                {inr(KPI_SNAPSHOT.revenue.last7d)}
              </span>
            </>
          }
          deltaPct={KPI_SNAPSHOT.revenue.deltaPct}
          deltaLabel="vs previous 7 days"
          tone="emerald"
          icon={<IconRupee className="size-5" />}
          onOpen={setOpen}
        />
        <KpiCard
          type="members"
          label="Active Members"
          value={<CountUp value={KPI_SNAPSHOT.members.active} />}
          subValue={
            <>
              of&nbsp;
              <span className="font-semibold text-slate-300">
                {KPI_SNAPSHOT.members.total}
              </span>
              &nbsp;members
            </>
          }
          tone="blue"
          icon={<IconUsers className="size-5" />}
          onOpen={setOpen}
        />
        <KpiCard
          type="payments"
          label="Pending Payments"
          value={<CountUp value={KPI_SNAPSHOT.payments.pendingCount} />}
          subValue={
            <>
              Worth&nbsp;
              <span className="font-semibold text-slate-300">
                {inr(KPI_SNAPSHOT.payments.pendingAmount)}
              </span>
            </>
          }
          tone="amber"
          icon={<IconAlert className="size-5" />}
          onOpen={setOpen}
        />
        <KpiCard
          type="equipment"
          label="Equipment Downtime"
          value={<CountUp value={KPI_SNAPSHOT.equipment.downCount} />}
          subValue={
            <>
              Longest&nbsp;
              <span className="font-semibold text-slate-300">
                {KPI_SNAPSHOT.equipment.longestDown}d
              </span>
              &nbsp;down
            </>
          }
          tone="rose"
          icon={<IconWrench className="size-5" />}
          onOpen={setOpen}
        />
      </div>

      {/* Row 2: hero chart + attention rail */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueOverviewCard onDrillDown={setOpen} />
        </div>
        <AttentionPanel onDrillDown={setOpen} />
      </div>

      {/* Row 3: activity stream + member pulse */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentActivityCard onDrillDown={setOpen} />
        <MemberPulseCard onDrillDown={setOpen} />
      </div>

      {/* Tip footer */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/5 text-slate-300">
            <IconActivity className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Tip</p>
            <p className="text-xs text-slate-400">
              Every KPI card and panel here is a live entry point. Click any card or
              the "View details" buttons to drill deeper in a side drawer — no page
              change needed.
            </p>
          </div>
        </div>
      </section>

      <AnalyticsDrawer
        open={!!open}
        onClose={() => setOpen(null)}
        title={current?.title ?? ''}
        subtitle={current?.subtitle}
        summary={current?.summary}
      >
        {current?.body}
      </AnalyticsDrawer>
    </ModulePageShell>
  )
}
