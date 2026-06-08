import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard.service'
import { reportsService } from '../../services/reports.service'
import { membershipPaymentsService } from '../../services/membershipPayments.service'
import { authService } from '../../services/auth.service'

function formatInr(amount: number) {
  return `₹${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function useAdminKpis() {
  const canReports = authService.canReportsAccess()
  const canPayments = authService.canPaymentsAccess()

  return useQuery({
    queryKey: ['admin-dashboard-kpis', canReports, canPayments],
    queryFn: async () => {
      const now = new Date()
      const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const toDate = now.toISOString().slice(0, 10)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [summaryRes, statsRes, reportRes, alertsRes, billingDashRes, recentPaymentsRes] =
        await Promise.allSettled([
          dashboardService.getSummary(),
          canReports ? dashboardService.getStatistics() : Promise.reject('no-reports'),
          canReports ? reportsService.getSummary(fromDate, toDate) : Promise.reject('no-reports'),
          canReports ? dashboardService.getNotifications() : Promise.reject('no-reports'),
          canPayments ? membershipPaymentsService.dashboard() : Promise.reject('no-payments'),
          canPayments
            ? membershipPaymentsService.listTransactions({
                fromDate: todayStart.toISOString().slice(0, 10),
                toDate: toDate,
                status: 'Completed',
              })
            : Promise.reject('no-payments'),
        ])

      const summary = summaryRes.status === 'fulfilled' ? summaryRes.value.data : null
      const billingDash = billingDashRes.status === 'fulfilled' ? billingDashRes.value.data : null
      const report = reportRes.status === 'fulfilled' ? reportRes.value.data : null
      const alerts = alertsRes.status === 'fulfilled' ? alertsRes.value.data.alerts ?? [] : []
      const trainerRanks =
        statsRes.status === 'fulfilled'
          ? [...(statsRes.value.data.trainersWithUserCount ?? [])].sort(
              (a, b) => b.userCount - a.userCount,
            )
          : []

      const recentTx =
        recentPaymentsRes.status === 'fulfilled' ? recentPaymentsRes.value.data ?? [] : []
      const recentPayments = recentTx.slice(0, 5).map((t) => ({
        id: t.id,
        amount: Number(t.transactionAmount ?? 0),
      }))

      const summaryTodayRevenue = Number(summary?.todayRevenue ?? 0)
      const billingTodayRevenue = Number(billingDash?.todayCollections ?? 0)
      const todayRevenue =
        summaryTodayRevenue > 0 ? summaryTodayRevenue : billingTodayRevenue > 0 ? billingTodayRevenue : 0

      const attendanceFromReport = report?.attendanceTrend?.length
        ? report.attendanceTrend[report.attendanceTrend.length - 1]?.count
        : undefined

      return {
        activeMembers: summary?.activeMembers ?? 0,
        newJoins: summary?.newMembersToday ?? 0,
        expiringSoon: summary?.expiringMembershipsNext14Days ?? 0,
        todayRevenue,
        attendanceToday: summary?.todayAttendance ?? attendanceFromReport ?? 0,
        report,
        alerts,
        trainerRanks: trainerRanks.slice(0, 5),
        recentPayments,
        formatInr,
        summary,
      }
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}
