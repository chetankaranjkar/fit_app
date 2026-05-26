import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { HeroStat } from '../../components/dashboard/premium/HeroStat'
import { getDashboardUser } from '../../lib/dashboardUser'
import { workoutTrackingService } from '../../services/workoutTracking.service'

export function WorkoutAdminMonitoringPage() {
  const { userName } = getDashboardUser()

  const { data, isLoading } = useQuery({
    queryKey: ['workout-admin-monitoring'],
    queryFn: async () => {
      const { data: payload } = await workoutTrackingService.adminMonitoring(40)
      return payload
    },
  })

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-[1200px] space-y-6 pb-12">
        <header>
          <Link to="/dashboard" className="text-sm text-orange-400 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">Workout sync health</h1>
          <p className="mt-1 text-sm text-slate-400">
            Active live sessions and recent completions across all members.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <HeroStat
            role="admin"
            label="Live now"
            numericValue={isLoading ? 0 : data?.activeLiveSessions ?? 0}
          />
          <HeroStat
            role="admin"
            label="Completed today"
            numericValue={isLoading ? 0 : data?.completedToday ?? 0}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel role="admin" title="Active sessions">
            <SessionList items={data?.activeSessions} empty="No in-progress workouts." />
          </GlassPanel>
          <GlassPanel role="admin" title="Recently completed">
            <SessionList items={data?.recentCompleted} empty="No completions yet today." />
          </GlassPanel>
        </div>
      </div>
    </DashboardLayout>
  )
}

function SessionList({
  items,
  empty,
}: {
  items?: { sessionId: number; memberName: string; planName?: string | null; status: string; completionPercent?: number | null }[]
  empty: string
}) {
  if (!items?.length) {
    return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
  }
  return (
    <ul className="divide-y divide-white/5">
      {items.map((s) => (
        <li key={s.sessionId} className="flex items-center justify-between py-3 text-sm">
          <div>
            <p className="font-medium text-white">{s.memberName}</p>
            <p className="text-xs text-slate-500">
              {s.planName ?? 'Workout'} · {s.status}
            </p>
          </div>
          <span className="text-orange-300">
            {s.completionPercent != null ? `${Math.round(s.completionPercent)}%` : '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}
