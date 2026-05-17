import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard.service'
import { reportsService } from '../../services/reports.service'
import { usersService } from '../../services/users.service'
import { userMembershipsService } from '../../services/userMemberships.service'
import { paymentsService } from '../../services/payments.service'
import { authService } from '../../services/auth.service'
import type { User } from '../../types/user'
import type { UserMembership } from '../../types/userMembership'
import type { Payment } from '../../types/payment'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function formatInr(amount: number) {
  return `₹${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function useAdminKpis() {
  const canReports = authService.hasPermission('Reports')

  return useQuery({
    queryKey: ['admin-dashboard-kpis'],
    queryFn: async () => {
      const now = new Date()
      const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const toDate = now.toISOString().slice(0, 10)
      const today = startOfToday()

      const [usersRes, membershipsRes, paymentsRes, statsRes, reportRes, alertsRes] =
        await Promise.allSettled([
          usersService.getAll(),
          userMembershipsService.getAll(),
          paymentsService.getAll(),
          dashboardService.getStatistics(),
          canReports ? reportsService.getSummary(fromDate, toDate) : Promise.reject('no-reports'),
          canReports ? dashboardService.getNotifications() : Promise.reject('no-reports'),
        ])

      const users =
        usersRes.status === 'fulfilled' && Array.isArray(usersRes.value.data)
          ? (usersRes.value.data as User[])
          : []
      const memberships =
        membershipsRes.status === 'fulfilled' && Array.isArray(membershipsRes.value.data)
          ? (membershipsRes.value.data as UserMembership[])
          : []
      const payments =
        paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value.data)
          ? (paymentsRes.value.data as Payment[])
          : []

      const activeMembers = users.filter((u) => u.isActive !== false).length
      const newJoins = users.filter((u) => {
        const d = new Date(u.registrationDate ?? '')
        return !Number.isNaN(d.getTime()) && d >= today
      }).length

      const expiringSoon = memberships.filter(
        (m) => m.status === 'Active' && m.endDate && new Date(m.endDate) <= new Date(Date.now() + 14 * 86400000)
      ).length

      const todayRevenue = payments
        .filter((p) => {
          const d = new Date(p.paymentDate ?? '')
          return !Number.isNaN(d.getTime()) && d >= today
        })
        .reduce((s, p) => s + (p.amount ?? 0), 0)

      const report = reportRes.status === 'fulfilled' ? reportRes.value.data : null
      const alerts = alertsRes.status === 'fulfilled' ? alertsRes.value.data.alerts ?? [] : []
      const trainerRanks =
        statsRes.status === 'fulfilled'
          ? [...(statsRes.value.data.trainersWithUserCount ?? [])].sort(
              (a, b) => b.userCount - a.userCount
            )
          : []

      const recentPayments = [...payments]
        .sort(
          (a, b) =>
            new Date(b.paymentDate ?? 0).getTime() - new Date(a.paymentDate ?? 0).getTime()
        )
        .slice(0, 5)

      const expiringList = memberships
        .filter((m) => m.status === 'Active' && m.endDate)
        .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
        .slice(0, 5)

      return {
        activeMembers,
        newJoins,
        expiringSoon,
        todayRevenue,
        attendanceToday: report?.attendanceTrend?.slice(-1)[0]?.count ?? 0,
        report,
        alerts,
        trainerRanks: trainerRanks.slice(0, 5),
        recentPayments,
        expiringList,
        formatInr,
      }
    },
  })
}
