import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, ChevronDown, Plus } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardPageContent } from '../../components/layout/DataPageShell'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { TrendAreaChart } from '../../components/dashboard/premium/TrendAreaChart'
import { getDashboardUser } from '../../lib/dashboardUser'
import { formatInr } from '../../lib/formatInr'
import { useAdminKpis } from './useAdminKpis'
import { usePermission } from '../../features/auth/hooks/usePermission'
import { authService } from '../../services/auth.service'
import { membershipPaymentsService } from '../../services/membershipPayments.service'
import { RenewalQueuePanel } from '../../components/dashboard/RenewalQueuePanel'
import { DailyWorkListPanel } from '../../components/dashboard/DailyWorkListPanel'
import { hasAnyDailyWorkAccess } from '../../lib/dailyWorkList'
import { OutboundRemindersOpsPanel } from '../../components/dashboard/OutboundRemindersOpsPanel'
import './adminDashboard.css'

export function AdminDashboardPage() {
  const { userName } = getDashboardUser()
  const { data, isLoading, isError, refetch } = useAdminKpis()
  const canBillingDash = usePermission(authService.permissionCodes.payments)
  const canReports = usePermission(authService.permissionCodes.reports)
  const canTraining = usePermission(authService.permissionCodes.trainerAccess)
  const canCreateUsers = usePermission(authService.permissionCodes.createUsers)
  const [trend, setTrend] = useState<'revenue' | 'attendance'>('revenue')
  const [renewalsOpen, setRenewalsOpen] = useState(false)
  const [remindersOpen, setRemindersOpen] = useState(false)
  const { data: billingDash, isLoading: billingLoading, isError: billingError, refetch: refetchBilling } = useQuery({
    queryKey: ['membership-payments-dashboard'],
    queryFn: async () => (await membershipPaymentsService.dashboard()).data,
    enabled: canBillingDash,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const monthLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const revenueChart = data?.report?.revenueTrend?.map((p) => ({
    label: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: p.amount,
  })) ?? []
  const attendanceChart = data?.report?.attendanceTrend?.map((p) => ({
    label: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: p.count,
  })) ?? []
  const attendanceValues = attendanceChart.map((p) => p.value)
  const peakAttendance = attendanceValues.length ? Math.max(...attendanceValues) : null
  const avgAttendance = attendanceValues.length
    ? Math.round(attendanceValues.reduce((sum, value) => sum + value, 0) / attendanceValues.length) : null
  const metrics = [
    ...(canBillingDash ? [{ label: "Today's revenue", value: data ? formatInr(data.todayRevenue) : '—' }] : []),
    { label: 'Active members', value: data?.activeMembers.toLocaleString() ?? '—' },
    { label: 'Attendance today', value: data?.attendanceToday.toLocaleString() ?? '—' },
    { label: 'New joins today', value: data?.newJoins.toLocaleString() ?? '—' },
    { label: 'Expiring in 14 days', value: data?.expiringSoon.toLocaleString() ?? '—' },
  ]
  const billingMetrics = [
    { label: 'Outstanding', value: billingDash ? formatInr(Number(billingDash.totalPendingAmount)) : '—' },
    { label: 'Pending invoices', value: billingDash?.pendingPaymentsCount.toLocaleString() ?? '—' },
    { label: 'Overdue members', value: billingDash?.overdueMembersCount.toLocaleString() ?? '—', urgent: true },
    { label: 'Collected today', value: billingDash ? formatInr(Number(billingDash.todayCollections)) : '—' },
    { label: 'Due soon', value: billingDash?.upcomingDueCount.toLocaleString() ?? '—' },
    { label: 'Partial payments', value: billingDash?.partialMembersCount.toLocaleString() ?? '—' },
  ]

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="admin-dashboard">
        <header className="flex flex-wrap items-end justify-between gap-4 pt-1">
          <div>
            <p className="admin-muted text-sm">{greeting} · {dateLabel}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Your gym, today</h1>
            <p className="admin-muted mt-2 text-sm">See how the gym is doing and what needs your attention.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canBillingDash && <Link className="admin-action admin-action-primary" to="/dashboard/user-memberships">Memberships <ArrowUpRight size={16} aria-hidden="true" /></Link>}
            {canCreateUsers && <Link className="admin-action" to="/dashboard/users"><Plus size={16} aria-hidden="true" /> Add member</Link>}
            {canTraining && <Link className="admin-action" to="/dashboard/training/workout-assignments">Assign workouts <ArrowUpRight size={16} aria-hidden="true" /></Link>}
          </div>
        </header>
        <dl className="admin-metrics" aria-label="Gym overview">
          {metrics.map((metric) => <div key={metric.label}><dt className="admin-muted text-xs sm:text-sm">{metric.label}</dt><dd className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{isLoading ? '…' : metric.value}</dd></div>)}
        </dl>
        {isError && <p role="alert" className="text-sm text-rose-400">Could not load the overview. <button type="button" onClick={() => void refetch()} className="underline">Retry</button></p>}
        {hasAnyDailyWorkAccess() && <DailyWorkListPanel role="admin" title="Needs attention" appearance="flat" />}

        {canReports && <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
          <GlassPanel appearance="flat" title="Business trends" subtitle={`${monthLabel} · month to date`} action={
            <div className="admin-switch" role="group" aria-label="Business trend">
              {(['revenue', 'attendance'] as const).map((value) => <button key={value} type="button" aria-pressed={trend === value} onClick={() => setTrend(value)}>{value === 'revenue' ? 'Revenue' : 'Attendance'}</button>)}
            </div>
          }>
            {isLoading ? <p className="admin-muted py-6 text-sm">Loading business trends…</p> : (trend === 'revenue' ? revenueChart : attendanceChart).length ? (
              <TrendAreaChart key={trend} role="admin" height={260} data={trend === 'revenue' ? revenueChart : attendanceChart} valueFormatter={trend === 'revenue' ? formatInr : (value) => value.toLocaleString()} />
            ) : <p className="admin-muted py-6 text-sm">No {trend} data available for this month.</p>}
          </GlassPanel>
          <GlassPanel appearance="flat" title="Monthly summary" subtitle="Based on the current reporting period">
            <dl className="admin-summary divide-y divide-[var(--dashboard-border)]">
              <div><dt>Revenue</dt><dd>{data?.report ? formatInr(data.report.totalRevenue) : '—'}</dd></div>
              <div><dt>Member churn</dt><dd>{data?.report ? `${data.report.churnCount} members${data.report.churnRatePercent != null ? ` (${data.report.churnRatePercent.toFixed(1)}%)` : ''}` : '—'}</dd></div>
              <div><dt>Peak day check-ins</dt><dd>{peakAttendance ?? '—'}</dd></div>
              <div><dt>Average daily check-ins</dt><dd>{avgAttendance ?? '—'}</dd></div>
            </dl>
            <Link className="admin-text-link mt-4 inline-flex items-center gap-1 text-sm" to="/dashboard/owner-analytics">Explore reports <ArrowUpRight size={14} aria-hidden="true" /></Link>
          </GlassPanel>
        </section>}

        {canBillingDash && <GlassPanel appearance="flat" title="Membership billing" subtitle="Balances and collections" action={<Link className="admin-text-link text-sm" to="/dashboard/user-memberships">View memberships →</Link>}>
          <dl className="admin-metrics admin-billing-metrics" aria-label="Membership billing summary">
            {billingMetrics.map((metric) => <div key={metric.label}><dt className="admin-muted text-xs">{metric.label}</dt><dd className={`mt-2 text-xl font-semibold ${metric.urgent && (billingDash?.overdueMembersCount ?? 0) > 0 ? 'admin-urgent' : ''}`}>{billingLoading ? '…' : metric.value}</dd></div>)}
          </dl>
          {billingError && <p role="alert" className="mt-3 text-sm text-rose-400">Could not load billing. <button type="button" className="underline" onClick={() => void refetchBilling()}>Retry</button></p>}
        </GlassPanel>}

        <section className="grid gap-8 lg:grid-cols-3">
          {canReports && <GlassPanel appearance="flat" title="Trainer workload" subtitle="By active clients">
            <ul className="admin-rows">
              {(data?.trainerRanks ?? []).map((trainer, index) => <li key={trainer.trainerId}><span className="min-w-0 truncate"><span className="admin-muted mr-3 text-xs">{String(index + 1).padStart(2, '0')}</span>{trainer.trainerName}</span><span className="admin-muted shrink-0 text-xs">{trainer.userCount} clients</span></li>)}
              {!data?.trainerRanks?.length && <li className="admin-muted text-sm">{isLoading ? 'Loading trainers…' : 'No trainer data available.'}</li>}
            </ul>
          </GlassPanel>}
          {canBillingDash && <GlassPanel appearance="flat" title="Recent payments" subtitle="Completed today" action={<Link to="/dashboard/payments" className="admin-text-link text-xs">View all →</Link>}>
            <ul className="admin-rows">
              {(data?.recentPayments ?? []).map((payment) => <li key={payment.id}><span className="text-sm">Payment #{payment.id}</span><span className="text-sm font-medium">{formatInr(payment.amount)}</span></li>)}
              {!data?.recentPayments?.length && <li className="admin-muted text-sm">{isLoading ? 'Loading payments…' : 'No completed payments today.'}</li>}
            </ul>
          </GlassPanel>}
          {canReports && <GlassPanel appearance="flat" title="Gym alerts">
            <ul className="admin-alerts">
              {(data?.alerts ?? []).slice(0, 5).map((alert, index) => <li key={`${alert.type}-${index}`} data-severity={alert.severity}><span className="text-sm font-medium">{alert.title}</span><p className="admin-muted mt-1 text-xs">{alert.message}</p></li>)}
              {!data?.alerts?.length && <li className="admin-muted text-sm">{isLoading ? 'Loading alerts…' : 'No active alerts.'}</li>}
            </ul>
          </GlassPanel>}
        </section>

        <div className="admin-details">
          {canBillingDash && <details open={renewalsOpen} onToggle={(event) => setRenewalsOpen(event.currentTarget.open)}>
            <summary><span><span className="font-medium">Renewal queue</span><span className="admin-muted mt-1 block text-xs">Search memberships ending soon or recently expired</span></span><ChevronDown size={18} aria-hidden="true" /></summary>
            {renewalsOpen && <RenewalQueuePanel enabled appearance="flat" />}
          </details>}
          {canReports && <details open={remindersOpen} onToggle={(event) => setRemindersOpen(event.currentTarget.open)}>
            <summary><span><span className="font-medium">Reminder operations</span><span className="admin-muted mt-1 block text-xs">Email, WhatsApp, and scheduled reminder status</span></span><ChevronDown size={18} aria-hidden="true" /></summary>
            {remindersOpen && <div className="admin-reminders pb-4"><OutboundRemindersOpsPanel enabled /></div>}
          </details>}
        </div>
        <nav aria-label="Dashboard shortcuts" className="flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--dashboard-border)] pt-5 text-sm">
          {canTraining && <><Link className="admin-text-link" to="/dashboard/training/programs/new">New program →</Link><Link className="admin-text-link" to="/dashboard/trainers">Trainers →</Link></>}
          {canBillingDash && <Link className="admin-text-link" to="/dashboard/membership-plans">Plan catalog →</Link>}
          {canReports && <Link className="admin-text-link" to="/dashboard/owner-analytics">Reports →</Link>}
          {authService.canConfigAccess() && <Link className="admin-text-link" to="/dashboard/security">Security & notices →</Link>}
        </nav>
      </DashboardPageContent>
    </DashboardLayout>
  )
}
