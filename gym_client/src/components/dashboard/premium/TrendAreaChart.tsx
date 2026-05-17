import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardRole } from '../../../features/auth/roleRouting'

const stroke: Record<DashboardRole, string> = {
  admin: '#60a5fa',
  trainer: '#fb923c',
  member: '#f97316',
}

const fill: Record<DashboardRole, string> = {
  admin: 'url(#adminGrad)',
  trainer: 'url(#trainerGrad)',
  member: 'url(#memberGrad)',
}

export function TrendAreaChart({
  data,
  dataKey,
  role = 'admin',
  height = 220,
  valueFormatter = (v: number) => String(v),
}: {
  data: { label: string; value: number }[]
  dataKey?: string
  role?: DashboardRole
  height?: number
  valueFormatter?: (v: number) => string
}) {
  const key = dataKey ?? 'value'
  const chartData = data.map((d) => ({ name: d.label, [key]: d.value }))

  return (
    <div className="min-h-0 w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="trainerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{
              background: 'rgba(15,15,35,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(v) => [valueFormatter(Number(v ?? 0)), '']}
          />
          <Area
            type="monotone"
            dataKey={key}
            stroke={stroke[role]}
            fill={fill[role]}
            strokeWidth={2}
            animationDuration={250}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
