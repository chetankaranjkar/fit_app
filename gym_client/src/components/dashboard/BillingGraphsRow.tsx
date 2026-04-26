import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { paymentsService } from '../../services/payments.service'
import { userMembershipsService } from '../../services/userMemberships.service'
import { membershipPlansService } from '../../services/membershipPlans.service'
import type { Payment } from '../../types/payment'
import type { UserMembership } from '../../types/userMembership'
import type { MembershipPlan } from '../../types/membershipPlan'

function startOfCurrentMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function inCurrentMonth(isoDate: string) {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return false
  const m = startOfCurrentMonth()
  return d >= m
}

function formatInr(v: number) {
  return `₹${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function BillingGraphsRow() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-billing-graphs'],
    queryFn: async () => {
      const [paymentsRes, membershipsRes, plansRes] = await Promise.all([
        paymentsService.getAll(),
        userMembershipsService.getAll(),
        membershipPlansService.getAll(),
      ])
      const payments = Array.isArray(paymentsRes.data) ? (paymentsRes.data as Payment[]) : []
      const memberships = Array.isArray(membershipsRes.data)
        ? (membershipsRes.data as UserMembership[])
        : []
      const plans = Array.isArray(plansRes.data) ? (plansRes.data as MembershipPlan[]) : []
      return { payments, memberships, plans }
    },
    staleTime: 60_000,
  })

  const { modeData, plansData } = useMemo(() => {
    const empty = { modeData: [], plansData: [] as Array<{ name: string; revenue: number; payments: number }> }
    if (!data) return empty

    const monthPayments = data.payments.filter((p) => inCurrentMonth(p.paymentDate))
    const modeAmountMap = new Map<string, number>()
    for (const p of monthPayments) {
      modeAmountMap.set(p.paymentMode, (modeAmountMap.get(p.paymentMode) ?? 0) + (p.amount || 0))
    }
    const modeColorMap: Record<string, string> = {
      Cash: '#60a5fa',
      Upi: '#34d399',
      Card: '#c084fc',
    }
    const modeData = ['Cash', 'Upi', 'Card']
      .map((mode) => ({
        name: mode,
        value: modeAmountMap.get(mode) ?? 0,
        color: modeColorMap[mode],
      }))
      .filter((m) => m.value > 0)

    const membershipById = new Map<number, UserMembership>()
    for (const m of data.memberships) membershipById.set(m.id, m)

    const planNameById = new Map<number, string>()
    for (const p of data.plans) planNameById.set(p.id, p.planName)

    const planAgg = new Map<number, { revenue: number; payments: number }>()
    for (const p of monthPayments) {
      const membership = membershipById.get(p.membershipId)
      if (!membership) continue
      const planId = membership.planId
      const prev = planAgg.get(planId) ?? { revenue: 0, payments: 0 }
      prev.revenue += p.amount || 0
      prev.payments += 1
      planAgg.set(planId, prev)
    }

    const plansData = [...planAgg.entries()]
      .map(([planId, agg]) => ({
        name: planNameById.get(planId) ?? `Plan #${planId}`,
        revenue: Number(agg.revenue.toFixed(2)),
        payments: agg.payments,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)

    return { modeData, plansData }
  }, [data])

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="dashboard-card glass-card min-w-0 rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Payment Mode Split</h3>
            <p className="text-xs text-slate-400">Revenue share this month by payment mode</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            This Month
          </span>
        </div>
        <div className="h-72 min-h-[220px]">
          {isLoading ? (
            <p className="pt-10 text-center text-sm text-slate-500">Loading…</p>
          ) : modeData.length === 0 ? (
            <p className="pt-10 text-center text-sm text-slate-500">No payment data this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <PieChart>
                <Pie
                  data={modeData}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {modeData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(11,11,26,0.95)',
                    borderRadius: '12px',
                    border: '1px solid rgba(148,163,184,0.2)',
                    color: '#e5e7eb',
                    backdropFilter: 'blur(12px)',
                  }}
                  formatter={(value: number | undefined) => [formatInr(value ?? 0), 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="dashboard-card glass-card min-w-0 rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Top Plans Sold</h3>
            <p className="text-xs text-slate-400">Highest revenue plans this month</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            This Month
          </span>
        </div>
        <div className="h-72 min-h-[220px]">
          {isLoading ? (
            <p className="pt-10 text-center text-sm text-slate-500">Loading…</p>
          ) : plansData.length === 0 ? (
            <p className="pt-10 text-center text-sm text-slate-500">No plan sales this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
              <BarChart data={plansData} margin={{ top: 8, right: 8, left: 0, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
                  tickLine={false}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                  height={54}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatInr(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(11,11,26,0.95)',
                    borderRadius: '12px',
                    border: '1px solid rgba(148,163,184,0.2)',
                    color: '#e5e7eb',
                    backdropFilter: 'blur(12px)',
                  }}
                  formatter={(value: number | undefined, name) =>
                    name === 'revenue' ? [formatInr(value ?? 0), 'Revenue'] : [value ?? 0, 'Payments']
                  }
                />
                <Bar dataKey="revenue" fill="url(#planRevenueGradient)" radius={[8, 8, 2, 2]} />
                <defs>
                  <linearGradient id="planRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
