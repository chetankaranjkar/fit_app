import { attendanceService } from '../../../services/attendance.service'
import { dashboardService } from '../../../services/dashboard.service'
import { membershipPaymentsService } from '../../../services/membershipPayments.service'
import { reportsService } from '../../../services/reports.service'
import { usersService } from '../../../services/users.service'
import { userMembershipsService } from '../../../services/userMemberships.service'
import { gymOperationsService } from '../../gym-operations/services/gymOperations.service'
import type { Equipment } from '../../gym-operations/types'
import type {
  ActiveMember,
  EquipmentIssue,
  EquipmentStatus,
  PaymentEntry,
  PendingDue,
  RevenuePoint,
} from '../types'
import { KPI_SNAPSHOT } from './mockData'

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10)
}

function parseDateKey(value: string | Date) {
  const s = typeof value === 'string' ? value : value.toISOString()
  return s.slice(0, 10)
}

/** Fill missing days so charts always have a continuous 30-day series. */
export function fillRevenueSeries(
  trend: { date: string | Date; amount: number }[],
  days: number,
): RevenuePoint[] {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  const map = new Map<string, number>()
  for (const p of trend) {
    map.set(parseDateKey(p.date), (map.get(parseDateKey(p.date)) ?? 0) + (p.amount ?? 0))
  }
  const out: RevenuePoint[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dateOnly(d)
    out.push({ date: key, amount: map.get(key) ?? 0 })
  }
  return out
}

function memberDisplayName(firstName?: string, lastName?: string) {
  return `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Member'
}

function mapEquipmentIssues(equipment: Equipment[]): EquipmentIssue[] {
  return equipment
    .filter((e) => e.status === 'OUT_OF_ORDER' || e.status === 'UNDER_MAINTENANCE')
    .map((e) => {
      const reported = e.nextServiceDate ?? e.purchaseDate
      const status: EquipmentStatus =
        e.status === 'OUT_OF_ORDER' ? 'OUT_OF_ORDER' : 'UNDER_MAINTENANCE'
      return {
        id: e.id,
        equipmentName: e.name,
        location: e.location,
        issue: e.notes?.trim() || `Marked ${e.status.replace(/_/g, ' ').toLowerCase()}`,
        status,
        reportedDate: reported,
      }
    })
}

function longestEquipmentDownDays(issues: EquipmentIssue[]) {
  if (!issues.length) return 0
  const now = Date.now()
  return issues.reduce((max, e) => {
    const days = Math.floor((now - new Date(e.reportedDate).getTime()) / 86400000)
    return Math.max(max, Math.max(0, days))
  }, 0)
}

export type OwnerAnalyticsSnapshot = {
  revenue: (typeof KPI_SNAPSHOT)['revenue']
  memberKpis: (typeof KPI_SNAPSHOT)['members']
  payments: (typeof KPI_SNAPSHOT)['payments']
  equipment: (typeof KPI_SNAPSHOT)['equipment']
  revenue30d: RevenuePoint[]
  recentPayments: PaymentEntry[]
  pendingDues: PendingDue[]
  memberRows: ActiveMember[]
  equipmentIssues: EquipmentIssue[]
  planBuckets: { plan: string; count: number }[]
}

export async function fetchOwnerAnalyticsSnapshot(): Promise<OwnerAnalyticsSnapshot> {
  const now = new Date()
  const toDate = dateOnly(now)
  const from30 = new Date(now)
  from30.setDate(from30.getDate() - 29)
  const from30Str = dateOnly(from30)

  const [
    summaryRes,
    reportRes,
    billingRes,
    enterpriseRes,
    transactionsRes,
    equipmentRes,
    usersRes,
    membershipsRes,
    attendanceRes,
  ] = await Promise.allSettled([
    dashboardService.getSummary(),
    reportsService.getSummary(from30Str, toDate),
    membershipPaymentsService.dashboard(),
    membershipPaymentsService.enterpriseDashboard(),
    membershipPaymentsService.listTransactions({
      fromDate: from30Str,
      toDate,
      status: 'Completed',
    }),
    gymOperationsService.listEquipment(),
    usersService.getPaged({ page: 1, pageSize: 200, membersOnly: true, includeBilling: true }),
    userMembershipsService.getPaged({ page: 1, pageSize: 200, status: 'Active' }),
    attendanceService.getByDateRange(from30Str, toDate),
  ])

  const summary = summaryRes.status === 'fulfilled' ? summaryRes.value.data : null
  const report = reportRes.status === 'fulfilled' ? reportRes.value.data : null
  const billing = billingRes.status === 'fulfilled' ? billingRes.value.data : null
  const enterprise =
    enterpriseRes.status === 'fulfilled' ? enterpriseRes.value.data : null

  const revenue30d = fillRevenueSeries(
    (report?.revenueTrend ?? []).map((p) => ({
      date: p.date,
      amount: p.amount ?? 0,
    })),
    30,
  )

  const last7 = revenue30d.slice(-7).reduce((s, p) => s + p.amount, 0)
  const prev7 = revenue30d.slice(-14, -7).reduce((s, p) => s + p.amount, 0)
  const total30 = revenue30d.reduce((s, p) => s + p.amount, 0)
  const deltaPct = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0

  const planByUserId = new Map<number, string>()
  if (membershipsRes.status === 'fulfilled') {
    for (const m of membershipsRes.value.data.items ?? []) {
      if (m.userId && m.planName) planByUserId.set(m.userId, m.planName)
    }
  }

  const lastVisitByUser = new Map<number, string>()
  if (attendanceRes.status === 'fulfilled') {
    for (const log of attendanceRes.value.data ?? []) {
      const at = log.checkOutTime ?? log.checkInTime ?? log.attendanceDate
      const prev = lastVisitByUser.get(log.userId)
      if (!prev || new Date(at).getTime() > new Date(prev).getTime()) {
        lastVisitByUser.set(log.userId, at)
      }
    }
  }

  const members: ActiveMember[] = []
  if (usersRes.status === 'fulfilled') {
    for (const u of usersRes.value.data.items ?? []) {
      const lastVisit =
        lastVisitByUser.get(u.id) ??
        u.paymentLastPaidDate ??
        u.registrationDate ??
        new Date(0).toISOString()
      const inactiveDays = (Date.now() - new Date(lastVisit).getTime()) / 86400000
      const status = inactiveDays <= 7 && u.isActive ? 'ACTIVE' : 'INACTIVE'
      members.push({
        id: String(u.id),
        name: memberDisplayName(u.firstName, u.lastName),
        plan: planByUserId.get(u.id) ?? '—',
        lastVisit,
        status,
      })
    }
  }

  const activeCount = members.filter((m) => m.status === 'ACTIVE').length
  const totalMembers = summary?.totalMembers ?? members.length
  const activeMembers = summary?.activeMembers ?? activeCount

  const pendingDues: PendingDue[] = []
  if (usersRes.status === 'fulfilled') {
    for (const u of usersRes.value.data.items ?? []) {
      const due = Number(u.pendingPaymentAmount ?? 0)
      if (due <= 0) continue
      pendingDues.push({
        id: String(u.id),
        memberName: memberDisplayName(u.firstName, u.lastName),
        dueAmount: due,
        dueDate: u.paymentNextDueDate ?? toDate,
        plan: planByUserId.get(u.id),
        remindersSent: u.isPaymentOverdue ? 1 : 0,
      })
    }
  }
  if (pendingDues.length === 0 && enterprise?.topDefaulters?.length) {
    for (const d of enterprise.topDefaulters) {
      pendingDues.push({
        id: `u-${d.userId}`,
        memberName: d.memberName,
        dueAmount: d.outstandingBalance,
        dueDate: toDate,
        plan: d.planName ?? undefined,
        remindersSent: 0,
      })
    }
  }

  const recentPayments: PaymentEntry[] = []
  if (transactionsRes.status === 'fulfilled') {
    for (const t of transactionsRes.value.data ?? []) {
      recentPayments.push({
        id: String(t.id),
        memberName: t.memberName?.trim() || 'Member',
        amount: t.transactionAmount,
        date: t.transactionDate,
        status: t.status === 'Refunded' ? 'REFUNDED' : 'PAID',
        plan: t.planName ?? undefined,
      })
    }
  }

  const equipmentIssues = mapEquipmentIssues(
    equipmentRes.status === 'fulfilled' ? equipmentRes.value : [],
  )
  const longestDown = longestEquipmentDownDays(equipmentIssues)

  const planBuckets: { plan: string; count: number }[] = []
  if (report?.planSales?.length) {
    for (const p of report.planSales) {
      const label = p.planName?.split(' ')[0] ?? 'Plan'
      planBuckets.push({ plan: label, count: p.salesCount })
    }
  } else {
    const buckets: Record<string, number> = {}
    members.forEach((m) => {
      const key = m.plan.split(' ')[0] || 'Other'
      buckets[key] = (buckets[key] ?? 0) + 1
    })
    planBuckets.push(
      ...Object.entries(buckets)
        .sort((a, b) => b[1] - a[1])
        .map(([plan, count]) => ({ plan, count })),
    )
  }

  const overdueCount =
    billing?.overdueMembersCount ??
    pendingDues.filter((d) => new Date(d.dueDate).getTime() < Date.now()).length

  return {
    revenue: {
      total30d: total30 || KPI_SNAPSHOT.revenue.total30d,
      last7d: last7,
      prev7d: prev7,
      deltaPct: Number.isFinite(deltaPct) ? deltaPct : 0,
    },
    memberKpis: {
      active: activeMembers,
      total: totalMembers,
      inactive: Math.max(0, totalMembers - activeMembers),
    },
    payments: {
      pendingCount: billing?.pendingPaymentsCount ?? pendingDues.length,
      pendingAmount: Number(billing?.totalPendingAmount ?? pendingDues.reduce((s, d) => s + d.dueAmount, 0)),
      overdueCount,
    },
    equipment: {
      downCount: equipmentIssues.length,
      longestDown,
      resolvedThisMonth: equipmentRes.status === 'fulfilled'
        ? equipmentRes.value.filter((e) => e.status === 'OPERATIONAL').length
        : 0,
    },
    revenue30d,
    recentPayments,
    pendingDues,
    memberRows: members,
    equipmentIssues,
    planBuckets,
  }
}
