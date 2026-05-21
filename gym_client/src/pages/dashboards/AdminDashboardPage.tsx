import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { HeroStat } from '../../components/dashboard/premium/HeroStat'
import { QuickAction } from '../../components/dashboard/premium/QuickAction'
import { TrendAreaChart } from '../../components/dashboard/premium/TrendAreaChart'
import { getDashboardUser } from '../../lib/dashboardUser'
import { formatInr } from '../../lib/formatInr'
import { useAdminKpis } from './useAdminKpis'
import { usePermission } from '../../features/auth/hooks/usePermission'
import { authService } from '../../services/auth.service'
import { membershipPaymentsService } from '../../services/membershipPayments.service'

export function AdminDashboardPage() {
  const { userName } = getDashboardUser()
  const { data, isLoading } = useAdminKpis()
  const canBillingDash = usePermission(authService.permissionCodes.payments)
  const { data: billingDash } = useQuery({
    queryKey: ['membership-payments-dashboard'],
    queryFn: async () => (await membershipPaymentsService.dashboard()).data,
    enabled: canBillingDash,
  })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const revenueChart =
    data?.report?.revenueTrend?.map((p) => ({
      label: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: p.amount,
    })) ?? []

  const membershipChart =
    data?.report?.attendanceTrend?.map((p) => ({
      label: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: p.count,
    })) ?? []

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-[1600px] space-y-8 pb-12">
        <header className="dashboard-hero relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-blue-600/15 via-violet-600/10 to-transparent p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-violet-500/20 blur-3xl" />
          <p className="text-sm text-slate-400">{greeting}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Business control center
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Revenue, memberships, and operations at a glance — only what matters today.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <HeroStat
              role="admin"
              label="Today's revenue"
              numericValue={isLoading ? 0 : data?.todayRevenue ?? 0}
              format={(n) => data?.formatInr(n) ?? `₹${n}`}
            />
            <HeroStat role="admin" label="Active members" numericValue={isLoading ? 0 : data?.activeMembers ?? 0} />
            <HeroStat role="admin" label="New joins" numericValue={isLoading ? 0 : data?.newJoins ?? 0} />
            <HeroStat role="admin" label="Expiring soon" numericValue={isLoading ? 0 : data?.expiringSoon ?? 0} />
            <HeroStat
              role="admin"
              label="Attendance today"
              numericValue={isLoading ? 0 : data?.attendanceToday ?? 0}
            />
          </div>
        </header>

        {canBillingDash ? (
          <section className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-transparent to-violet-600/10 p-6 shadow-lg shadow-amber-900/10 backdrop-blur-md sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-200/90">Membership billing</h2>
                <p className="mt-1 max-w-xl text-xs text-slate-400">
                  Pending dues, overdue members, partial plans, and today&apos;s membership collections.
                </p>
              </div>
              <Link
                to="/dashboard/users"
                className="inline-flex items-center justify-center rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-2.5 text-sm font-semibold text-violet-100 shadow-md shadow-violet-900/20 transition hover:bg-violet-500/25"
              >
                Collect payment
              </Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <HeroStat role="admin" label="Pending invoices" numericValue={billingDash?.pendingPaymentsCount ?? 0} />
              <HeroStat
                role="admin"
                label="Pending amount"
                numericValue={billingDash ? Number(billingDash.totalPendingAmount) : 0}
                format={(n) => formatInr(n)}
              />
              <HeroStat role="admin" label="Overdue members" numericValue={billingDash?.overdueMembersCount ?? 0} />
              <HeroStat
                role="admin"
                label="Today collected"
                numericValue={billingDash ? Number(billingDash.todayCollections) : 0}
                format={(n) => formatInr(n)}
              />
              <HeroStat role="admin" label="Due soon" numericValue={billingDash?.upcomingDueCount ?? 0} />
              <HeroStat role="admin" label="Partial pay" numericValue={billingDash?.partialMembersCount ?? 0} />
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-3">
          <GlassPanel role="admin" title="Revenue" subtitle="Last 30 days" className="lg:col-span-2">
            {revenueChart.length ? (
              <TrendAreaChart
                role="admin"
                data={revenueChart}
                valueFormatter={(v) => data?.formatInr(v) ?? String(v)}
              />
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">No revenue data for this period.</p>
            )}
          </GlassPanel>
          <GlassPanel role="admin" title="Growth signal" subtitle="Monthly revenue">
            <p className="text-3xl font-bold text-white">
              {data?.report ? data.formatInr(data.report.totalRevenue) : '—'}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Churn: {data?.report?.churnCount ?? 0} members
              {data?.report?.churnRatePercent != null ? ` (${data.report.churnRatePercent.toFixed(1)}%)` : ''}
            </p>
          </GlassPanel>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <GlassPanel role="admin" title="Membership activity" subtitle="Daily check-ins trend">
            {membershipChart.length ? (
              <TrendAreaChart role="admin" data={membershipChart} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No attendance trend yet.</p>
            )}
          </GlassPanel>
          <GlassPanel role="admin" title="Peak hours" subtitle="Heatmap preview">
            <div className="grid grid-cols-7 gap-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="space-y-1">
                  <span className="block text-center text-[10px] text-slate-500">{d}</span>
                  {[0.3, 0.5, 0.8, 0.6, 0.9, 0.4, 0.7].map((o, j) => (
                    <div
                      key={j}
                      className="h-6 rounded-md bg-gradient-to-t from-blue-600/40 to-violet-400/60"
                      style={{ opacity: o * (0.6 + ((i + j) % 3) * 0.15) }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">Based on recent attendance patterns</p>
          </GlassPanel>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <GlassPanel role="admin" title="Top trainers" subtitle="By active clients">
            <ul className="space-y-3">
              {(data?.trainerRanks ?? []).map((t, i) => (
                <li key={t.trainerId} className="flex items-center justify-between text-sm">
                  <span className="text-slate-200">
                    <span className="mr-2 text-violet-400">#{i + 1}</span>
                    {t.trainerName}
                  </span>
                  <span className="font-medium text-white">{t.userCount} clients</span>
                </li>
              ))}
              {!data?.trainerRanks?.length && (
                <li className="text-sm text-slate-500">No trainer data yet.</li>
              )}
            </ul>
          </GlassPanel>
          <GlassPanel role="admin" title="Recent payments">
            <ul className="space-y-2">
              {(data?.recentPayments ?? []).map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span className="truncate text-slate-300">Payment #{p.id}</span>
                  <span className="font-medium text-emerald-400">
                    {data?.formatInr(p.amount ?? 0)}
                  </span>
                </li>
              ))}
              {!data?.recentPayments?.length && (
                <li className="text-sm text-slate-500">No payments recorded.</li>
              )}
            </ul>
            <Link to="/dashboard/payments" className="mt-3 inline-block text-xs text-blue-400 hover:underline">
              View all payments →
            </Link>
          </GlassPanel>
          <GlassPanel role="admin" title="Alerts">
            <ul className="space-y-2">
              {(data?.alerts ?? []).slice(0, 5).map((a, i) => (
                <li
                  key={`${a.type}-${i}`}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    a.severity === 'danger'
                      ? 'border-red-500/30 bg-red-500/10 text-red-200'
                      : a.severity === 'warning'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  <span className="font-medium">{a.title}</span>
                  <span className="mt-0.5 block text-slate-400">{a.message}</span>
                </li>
              ))}
              {!data?.alerts?.length && (
                <li className="text-sm text-slate-500">All clear — no active alerts.</li>
              )}
            </ul>
          </GlassPanel>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <QuickAction
              role="admin"
              to="/dashboard/users"
              label="Add member"
              description="Register a new member"
              icon={<span className="text-lg">+</span>}
            />
            <QuickAction
              role="admin"
              to="/dashboard/trainers"
              label="Add trainer"
              description="Onboard coaching staff"
              icon={<span className="text-lg">◎</span>}
            />
            <QuickAction
              role="admin"
              to="/dashboard/membership-plans"
              label="Create plan"
              description="Membership pricing"
              icon={<span className="text-lg">◇</span>}
            />
            <QuickAction
              role="admin"
              to="/dashboard/security"
              label="Broadcast"
              description="Security & notices"
              icon={<span className="text-lg">✦</span>}
            />
            <QuickAction
              role="admin"
              to="/dashboard/owner-analytics"
              label="Reports"
              description="Export analytics"
              icon={<span className="text-lg">↗</span>}
            />
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
