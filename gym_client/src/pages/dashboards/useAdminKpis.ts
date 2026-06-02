import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard.service'
import { reportsService } from '../../services/reports.service'
import { paymentsService } from '../../services/payments.service'
import { userMembershipsService } from '../../services/userMemberships.service'
import { authService } from '../../services/auth.service'

function formatInr(amount: number) {
  return `₹${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function useAdminKpis() {
  const canReports = authService.hasPermission('Reports')

  return useQuery({
    queryKey: ['admin-dashboard-kpis', canReports],
    queryFn: async () => {
      const now = new Date()
      const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const toDate = now.toISOString().slice(0, 10)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [summaryRes, statsRes, reportRes, alertsRes, recentPaymentsRes, membershipsRes] =
        await Promise.allSettled([
          dashboardService.getSummary(),
          dashboardService.getStatistics(),
          canReports ? reportsService.getSummary(fromDate, toDate) : Promise.reject('no-reports'),
          canReports ? dashboardService.getNotifications() : Promise.reject('no-reports'),
          paymentsService.getPaged({
            page: 1,
            pageSize: 5,
            fromDate: todayStart.toISOString().slice(0, 10),
            sortBy: 'date',
            sortDir: 'desc',
          }),
          userMembershipsService.getPaged({
            page: 1,
            pageSize: 30,
            status: 'Active',
          }),
        ])

      const summary = summaryRes.status === 'fulfilled' ? summaryRes.value.data : null
      const report = reportRes.status === 'fulfilled' ? reportRes.value.data : null
      const alerts = alertsRes.status === 'fulfilled' ? alertsRes.value.data.alerts ?? [] : []
      const trainerRanks =
        statsRes.status === 'fulfilled'
          ? [...(statsRes.value.data.trainersWithUserCount ?? [])].sort(
              (a, b) => b.userCount - a.userCount,
            )
          : []

      const recentPayments =
        recentPaymentsRes.status === 'fulfilled' ? recentPaymentsRes.value.data.data ?? [] : []

      const memberships =
        membershipsRes.status === 'fulfilled' ? membershipsRes.value.data.items ?? [] : []

      const expiringList = memberships
        .filter((m) => m.endDate)
        .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
        .slice(0, 5)

      return {
        activeMembers: summary?.activeMembers ?? 0,
        newJoins: summary?.newMembersToday ?? 0,
        expiringSoon: summary?.expiringMembershipsNext14Days ?? 0,
        todayRevenue: summary?.todayRevenue ?? 0,
        attendanceToday: summary?.todayAttendance ?? report?.attendanceTrend?.slice(-1)[0]?.count ?? 0,
        report,
        alerts,
        trainerRanks: trainerRanks.slice(0, 5),
        recentPayments,
        expiringList,
        formatInr,
        summary,
      }
    },
    staleTime: 1000 * 60 * 2,
  })
}
