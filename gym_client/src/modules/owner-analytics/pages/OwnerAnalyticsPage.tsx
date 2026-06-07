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
import { useStaggerAnimation } from '../hooks/useAnimations'
import { useOwnerAnalyticsData } from '../hooks/useOwnerAnalyticsData'
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
  const { data, isFetching } = useOwnerAnalyticsData()

  const drawers = useMemo<Record<KpiType, DrawerConfig>>(
    () => ({
      revenue: {
        title: 'Revenue insights',
        subtitle: 'Breakdown, trend and recent payments',
        summary: <RevenueDrawerSummary />,
        body: <RevenueDrawerBody />,
      },
      members: {
        title: 'Member plans & visits',
        subtitle: 'Active paid memberships vs recent attendance',
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
  const revenue = data?.revenue
  const members = data?.memberKpis
  const payments = data?.payments
  const equipment = data?.equipment

  return (
    <ModulePageShell
      eyebrow="Owner Analytics"
      titleBefore="Your gym, at a "
      titleGradient="glance"
      subtitle={
        isFetching
          ? 'Refreshing live metrics from your gym data…'
          : 'Click any KPI to drill into contextual detail without leaving the page.'
      }
    >
      <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          type="revenue"
          label="Total Revenue (30d)"
          value={<CountUp value={revenue?.total30d ?? 0} format={inr} />}
          subValue={
            <>
              Last 7 days&nbsp;
              <span className="font-semibold text-slate-300">{inr(revenue?.last7d ?? 0)}</span>
            </>
          }
          deltaPct={revenue?.deltaPct ?? 0}
          deltaLabel="vs previous 7 days"
          tone="emerald"
          icon={<IconRupee className="size-5" />}
          onOpen={setOpen}
        />
        <KpiCard
          type="members"
          label="Active Plans"
          value={<CountUp value={members?.active ?? 0} />}
          subValue={
            <>
              of&nbsp;
              <span className="font-semibold text-slate-300">
                {(members?.total ?? 0).toLocaleString()}
              </span>
              &nbsp;registered
            </>
          }
          tone="blue"
          icon={<IconUsers className="size-5" />}
          onOpen={setOpen}
        />
        <KpiCard
          type="payments"
          label="Pending Payments"
          value={<CountUp value={payments?.pendingCount ?? 0} />}
          subValue={
            <>
              Worth&nbsp;
              <span className="font-semibold text-slate-300">
                {inr(payments?.pendingAmount ?? 0)}
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
          value={<CountUp value={equipment?.downCount ?? 0} />}
          subValue={
            <>
              Longest&nbsp;
              <span className="font-semibold text-slate-300">{equipment?.longestDown ?? 0}d</span>
              &nbsp;down
            </>
          }
          tone="rose"
          icon={<IconWrench className="size-5" />}
          onOpen={setOpen}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueOverviewCard onDrillDown={setOpen} />
        </div>
        <AttentionPanel onDrillDown={setOpen} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentActivityCard onDrillDown={setOpen} />
        <MemberPulseCard onDrillDown={setOpen} />
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/5 text-slate-300">
            <IconActivity className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Tip</p>
            <p className="text-xs text-slate-400">
              Metrics load from billing, members, attendance, and gym operations APIs. If a
              section is empty, add data in Payments, Members, or Equipment first.
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
