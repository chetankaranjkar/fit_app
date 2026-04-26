import { useQuery } from '@tanstack/react-query'
import { MetricCard } from './MetricCard'
import { usersService } from '../../services/users.service'
import { trainersService } from '../../services/trainers.service'
import { userMembershipsService } from '../../services/userMemberships.service'
import { paymentsService } from '../../services/payments.service'
import type { User } from '../../types/user'
import type { UserMembership } from '../../types/userMembership'
import type { Payment } from '../../types/payment'
import type { TrainerStats } from '../../types/trainer'

const icons = {
  users: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  trainer: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  dollar: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  spark: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function isInCurrentMonth(isoDate: string) {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function formatInr(amount: number) {
  return `₹${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function MetricCardsRow() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const [usersRes, trainersStatsRes, membershipsRes, paymentsRes] = await Promise.allSettled([
        usersService.getAll(),
        trainersService.getStats(),
        userMembershipsService.getAll(),
        paymentsService.getAll(),
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
      const trainerStats =
        trainersStatsRes.status === 'fulfilled'
          ? (trainersStatsRes.value.data as TrainerStats)
          : null

      const today = startOfToday()
      const in30Days = new Date(today)
      in30Days.setDate(in30Days.getDate() + 30)
      const last30 = new Date(today)
      last30.setDate(last30.getDate() - 30)

      const newUsers30 = users.filter((u) => {
        const d = new Date(u.registrationDate)
        return !Number.isNaN(d.getTime()) && d >= last30
      }).length

      const activeMemberships = memberships.filter((m) => m.status === 'Active').length
      const expiringSoon = memberships.filter((m) => {
        const end = new Date(m.endDate)
        return !Number.isNaN(end.getTime()) && end >= today && end <= in30Days
      }).length

      const monthPayments = payments.filter((p) => isInCurrentMonth(p.paymentDate))
      const monthRevenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)

      return {
        totalUsers: users.length,
        activeTrainers: trainerStats?.activeTrainers ?? 0,
        newUsers30,
        activeMemberships,
        expiringSoon,
        monthRevenue,
        monthPaymentCount: monthPayments.length,
      }
    },
    staleTime: 60_000,
  })

  const metrics = [
    {
      title: 'Total Users',
      value: isLoading ? '—' : data?.totalUsers ?? '—',
      gradient: 'from-blue-500 to-indigo-500',
      icon: icons.users,
      caption: 'All registered members',
    },
    {
      title: 'Active Trainers',
      value: isLoading ? '—' : data?.activeTrainers ?? '—',
      gradient: 'from-purple-500 to-fuchsia-500',
      icon: icons.trainer,
      caption: 'Available and active',
    },
    {
      title: 'New Users (30d)',
      value: isLoading ? '—' : data?.newUsers30 ?? '—',
      gradient: 'from-cyan-400 to-blue-500',
      icon: icons.spark,
      caption: 'Joined in last 30 days',
    },
    {
      title: 'Active Memberships',
      value: isLoading ? '—' : data?.activeMemberships ?? '—',
      gradient: 'from-sky-400 to-purple-500',
      icon: icons.trainer,
      caption: 'Currently active plans',
    },
    {
      title: 'Expiring (30d)',
      value: isLoading ? '—' : data?.expiringSoon ?? '—',
      gradient: 'from-amber-400 to-orange-500',
      icon: icons.spark,
      caption: 'Memberships nearing expiry',
    },
    {
      title: 'Revenue (This Month)',
      value: isLoading ? '—' : formatInr(data?.monthRevenue ?? 0),
      gradient: 'from-emerald-400 to-teal-500',
      icon: icons.dollar,
      caption: isLoading ? '—' : `${data?.monthPaymentCount ?? 0} payments this month`,
    },
  ]

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((m) => (
        <MetricCard
          key={m.title}
          className="metric-card"
          title={m.title}
          value={m.value}
          gradient={m.gradient}
          icon={m.icon}
          delta={m.delta}
          deltaTrend={m.deltaTrend}
          caption={m.caption}
        />
      ))}
    </div>
  )
}
