import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { getDashboardUser } from '../../lib/dashboardUser'
import { workoutTrackingService } from '../../services/workoutTracking.service'

export function TrainerMemberWorkoutTimelinePage() {
  const { memberId } = useParams<{ memberId: string }>()
  const id = Number(memberId)
  const { userName } = getDashboardUser()

  const { data, isLoading } = useQuery({
    queryKey: ['trainer-member-timeline', id],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async () => {
      const { data: payload } = await workoutTrackingService.trainerMemberTimeline(id)
      return payload
    },
  })

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto max-w-[1100px] space-y-6 pb-12">
        <header>
          <Link to="/dashboard" className="text-sm text-orange-400 hover:underline">
            ← Trainer dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">
            {isLoading ? 'Loading…' : data?.memberName ?? 'Member workouts'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Live tracking timeline · adherence {data?.adherencePercent ?? 0}% this week ·{' '}
            {data?.completedThisWeek ?? 0} completed
          </p>
        </header>

        <GlassPanel role="trainer" title="Recent sessions">
          <ul className="divide-y divide-white/5">
            {(data?.sessions ?? []).map((s) => (
              <li key={s.sessionId} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-white">{s.planName ?? 'Workout'}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(s.sessionDateUtc).toLocaleString()} · {s.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-orange-300">
                    {s.completionPercent != null ? `${Math.round(s.completionPercent)}%` : '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.totalVolume != null ? `${Math.round(s.totalVolume)} kg` : ''}
                  </p>
                </div>
              </li>
            ))}
            {!isLoading && !(data?.sessions?.length) ? (
              <li className="py-8 text-center text-slate-500">No tracked workouts yet.</li>
            ) : null}
          </ul>
        </GlassPanel>
      </div>
    </DashboardLayout>
  )
}
