import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardPageContent } from '../../components/layout/DataPageShell'
import { HeroStat } from '../../components/dashboard/premium/HeroStat'
import { DashboardMetricsGrid } from '../../components/layout/DashboardMetricsGrid'
import { QuickAction } from '../../components/dashboard/premium/QuickAction'
import { RenewalQueuePanel } from '../../components/dashboard/RenewalQueuePanel'
import { getDashboardUser } from '../../lib/dashboardUser'
import { dashboardService } from '../../services/dashboard.service'
import { usePermission } from '../../features/auth/hooks/usePermission'
import { authService } from '../../services/auth.service'
import { getStaffFrontDeskNavLinks } from '../../features/auth/navPermissions'

export function FrontDeskDashboardPage() {
  const { userName } = getDashboardUser()
  const canPayments = usePermission(authService.permissionCodes.payments)
  const canUsers = usePermission(authService.permissionCodes.usersAccess)

  const { data: summary } = useQuery({
    queryKey: ['front-desk-dashboard-summary'],
    queryFn: async () => (await dashboardService.getSummary()).data,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const navLinks = getStaffFrontDeskNavLinks().filter((l) => l.path !== '/dashboard')

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="max-w-[1400px]">
        <header className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-600/10 via-violet-600/10 to-transparent p-6 sm:p-8">
          <p className="text-sm text-slate-400">{greeting}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Front desk
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Check-ins, members, renewals, and payments — without the full admin menu.
          </p>
          <DashboardMetricsGrid cols={3} className="mt-6">
            <HeroStat role="admin" label="Attendance today" numericValue={summary?.todayAttendance ?? 0} />
            <HeroStat role="admin" label="Expiring soon" numericValue={summary?.expiringMembershipsNext14Days ?? 0} />
            {canPayments ? (
              <HeroStat
                role="admin"
                label="Today's revenue"
                numericValue={summary?.todayRevenue ?? 0}
                format={(n) => `₹${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              />
            ) : (
              <HeroStat role="admin" label="Active members" numericValue={summary?.activeMembers ?? 0} />
            )}
          </DashboardMetricsGrid>
        </header>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Quick actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {canUsers ? (
              <QuickAction
                role="admin"
                to="/dashboard/users"
                label="Members"
                description="Search, add, renew"
                icon={<span className="text-lg">◎</span>}
              />
            ) : null}
            {canPayments ? (
              <QuickAction
                role="admin"
                to="/dashboard/payments/collect"
                label="Collect payment"
                description="Membership installment"
                icon={<span className="text-lg">₹</span>}
              />
            ) : null}
            <QuickAction
              role="admin"
              to="/dashboard/access/scan"
              label="QR check-in"
              description="Venue scan test"
              icon={<span className="text-lg">▣</span>}
            />
            <QuickAction
              role="admin"
              to="/dashboard/attendance"
              label="Attendance"
              description="Today's log"
              icon={<span className="text-lg">✓</span>}
            />
          </div>
        </section>

        {canPayments ? (
          <section className="grid gap-6 lg:grid-cols-3">
            <RenewalQueuePanel enabled={canPayments} />
          </section>
        ) : null}

        {navLinks.length > 0 ? (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Your menu</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </DashboardPageContent>
    </DashboardLayout>
  )
}
