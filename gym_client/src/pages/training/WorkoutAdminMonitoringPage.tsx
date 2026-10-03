import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TrainingEmptyState } from '../../components/training/TrainingEmptyState'
import { TrainingJourneyNav } from '../../components/training/TrainingJourneyNav'
import { TRAINING_JOURNEY_PATHS } from '../../features/auth/trainingNav'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardPageContent } from '../../components/layout/DataPageShell'
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
      <DashboardPageContent className="max-w-[1200px]">
        <header>
          <Link to="/dashboard" className="text-sm text-orange-400 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">Workout sync health</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor step · gym-wide live sessions and today&apos;s completions. Coach-scoped review is a separate step.
          </p>
        </header>
        <TrainingJourneyNav />

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
            <SessionList
              items={data?.activeSessions}
              empty="No in-progress workouts."
              emptyActionLabel="Open review"
              emptyTo={TRAINING_JOURNEY_PATHS.review}
            />
          </GlassPanel>
          <GlassPanel role="admin" title="Recently completed">
            <SessionList
              items={data?.recentCompleted}
              empty="No completions yet today."
              emptyActionLabel="Assign a plan"
              emptyTo={TRAINING_JOURNEY_PATHS.assign}
            />
          </GlassPanel>
        </div>
      </DashboardPageContent>
    </DashboardLayout>
  )
}

function SessionList({
  items,
  empty,
  emptyActionLabel,
  emptyTo,
}: {
  items?: { sessionId: number; memberName: string; planName?: string | null; status: string; completionPercent?: number | null }[]
  empty: string
  emptyActionLabel: string
  emptyTo: string
}) {
  if (!items?.length) {
    return <TrainingEmptyState title={empty} body="When members train from an assigned plan, sessions appear here." actionLabel={emptyActionLabel} to={emptyTo} />
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
