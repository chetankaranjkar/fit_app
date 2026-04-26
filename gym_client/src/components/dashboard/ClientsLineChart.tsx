import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const data = [
  { week: 'Week 1', users: 120 },
  { week: 'Week 2', users: 280 },
  { week: 'Week 3', users: 380 },
  { week: 'Week 4', users: 820 },
  { week: 'Week 5', users: 1240 },
  { week: 'Week 6', users: 1560 },
  { week: 'Week 7', users: 1890 },
  { week: 'Week 8', users: 2356 },
]

const periodOptions = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const

export function ClientsLineChart() {
  const [period, setPeriod] = useState<(typeof periodOptions)[number]>('Yearly')

  return (
    <div className="glass-card min-w-0 overflow-hidden rounded-2xl p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Members Growth</h3>
          <p className="text-xs text-slate-400">Total active members over time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300 sm:flex">
            <span className="size-2 rounded-full bg-[linear-gradient(135deg,#60a5fa,#c084fc)]" />
            Members
          </div>
          <select
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            value={period}
            onChange={(e) => setPeriod(e.target.value as (typeof periodOptions)[number])}
          >
            {periodOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-slate-900">
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="h-72 min-h-[220px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.6} />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="strokeUsers" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis
              dataKey="week"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(11,11,26,0.95)',
                borderRadius: '12px',
                border: '1px solid rgba(148,163,184,0.2)',
                color: '#e5e7eb',
                backdropFilter: 'blur(12px)',
              }}
              labelStyle={{ color: '#94a3b8', fontSize: 12 }}
              formatter={(value: number | undefined) => [
                value != null ? value.toLocaleString() : '',
                'Members',
              ]}
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke="url(#strokeUsers)"
              strokeWidth={2.5}
              fill="url(#colorUsers)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
