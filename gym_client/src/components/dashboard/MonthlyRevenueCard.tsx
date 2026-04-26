import { useState } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const revenueData = [
  { name: 'Membership', value: 40, color: '#60a5fa' },
  { name: 'Trainers Fee', value: 30, color: '#c084fc' },
  { name: 'Maintenance', value: 20, color: '#22d3ee' },
  { name: 'Gross Income', value: 10, color: '#f472b6' },
]

const periodOptions = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const

export function MonthlyRevenueCard({ className }: { className?: string }) {
  const [period, setPeriod] = useState<(typeof periodOptions)[number]>('Monthly')

  return (
    <div
      className={`glass-card min-w-0 rounded-2xl p-6 ${className || ''}`}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Monthly Revenue</h3>
          <p className="text-xs text-slate-400">Breakdown by category</p>
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
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="h-56 min-h-[200px] w-56 min-w-[200px] flex-shrink-0 sm:h-60 sm:w-60">
          <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
            <PieChart>
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
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
                formatter={(value: number | undefined) => [
                  value != null ? `${value}%` : '',
                  'Share',
                ]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value) => (
                  <span className="text-xs text-slate-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-1">
          {revenueData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 rounded-full shadow-[0_0_8px]"
                  style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }}
                />
                <span className="text-xs font-medium text-slate-300">{item.name}</span>
              </div>
              <span className="text-xs font-semibold text-white">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
