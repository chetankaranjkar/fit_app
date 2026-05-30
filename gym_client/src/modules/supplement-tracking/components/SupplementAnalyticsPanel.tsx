import { useQuery } from '@tanstack/react-query'
import { supplementTrackingService } from '../services/supplementTracking.service'

export function SupplementAnalyticsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['supplement-analytics'],
    queryFn: async () => (await supplementTrackingService.getAnalytics()).data,
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card h-28 animate-pulse rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="glass-card-strong rounded-2xl border border-emerald-500/25 p-5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Active members on supplements</p>
          <p className="mt-2 font-display text-4xl text-white">{data.activeSupplementUsers}</p>
        </div>
        <div className="glass-card-strong rounded-2xl border border-[rgba(245,196,0,0.25)] p-5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Active assignments</p>
          <p className="mt-2 font-display text-4xl text-[#F5C400]">{data.totalActiveAssignments}</p>
        </div>
        <div className="glass-card-strong rounded-2xl border border-white/10 p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Top category</p>
          <p className="mt-2 font-display text-2xl text-white">
            {data.categoryUsage[0]?.category ?? '—'}
          </p>
          <p className="text-xs text-slate-400">
            {data.categoryUsage[0]?.activeAssignments ?? 0} active in category
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <h3 className="font-display text-lg text-white">Most assigned supplements</h3>
          <ul className="mt-4 space-y-3">
            {data.mostAssigned.length === 0 ? (
              <li className="text-sm text-slate-500">No assignments yet.</li>
            ) : (
              data.mostAssigned.map((row) => (
                <li key={row.supplementMasterId} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.category}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-[#F5C400]">{row.assignmentCount}</p>
                    <p className="text-[10px] text-slate-500">{row.activeCount} active</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <h3 className="font-display text-lg text-white">Category usage</h3>
          <ul className="mt-4 space-y-4">
            {data.categoryUsage.map((cat) => {
              const pct =
                data.totalActiveAssignments > 0
                  ? Math.round((cat.activeAssignments / data.totalActiveAssignments) * 100)
                  : 0
              return (
                <li key={cat.category}>
                  <div className="flex justify-between text-sm">
                    <span className="text-white">{cat.category}</span>
                    <span className="text-slate-400">
                      {cat.activeAssignments} / {cat.totalAssignments}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#F5C400] to-amber-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
