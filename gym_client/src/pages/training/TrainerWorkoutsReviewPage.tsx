import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardPageContent } from '../../components/layout/DataPageShell'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { HeroStat } from '../../components/dashboard/premium/HeroStat'
import { getSafeDashboardReturnPath } from '../../lib/safeReturnPath'
import {
  memberWorkoutTimelineUrl,
  trainingReturnLabel,
  workoutAssignmentUrl,
} from '../../lib/workoutAssignmentLinks'
import { getDashboardUser } from '../../lib/dashboardUser'
import { authService } from '../../services/auth.service'
import { workoutTrackingService } from '../../services/workoutTracking.service'
import { WorkoutSessionReviewModal } from '../../modules/workout-tracking/components/WorkoutSessionReviewModal'
import {
  isLiveWorkoutStatus,
  workoutStatusClass,
  workoutStatusLabel,
} from '../../modules/workout-tracking/lib/workoutSessionUi'
import type { MemberWorkoutSummary } from '../../types/workoutTracking'

type Filter = 'all' | 'live' | 'completed'

export function TrainerWorkoutsReviewPage() {
  const { userName } = getDashboardUser()
  const [searchParams] = useSearchParams()
  const returnToSafe = useMemo(
    () => getSafeDashboardReturnPath(searchParams.get('returnTo')),
    [searchParams],
  )
  const trainerId = authService.getCurrentUser()?.trainerId
  const [filter, setFilter] = useState<Filter>('all')
  const [reviewSessionId, setReviewSessionId] = useState<number | null>(null)

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['trainer-member-workouts', 'review'],
    queryFn: async () => {
      const { data } = await workoutTrackingService.trainerMemberWorkouts(40)
      return data ?? []
    },
    refetchInterval: (query) =>
      (query.state.data ?? []).some((w) => isLiveWorkoutStatus(w.status)) ? 20_000 : false,
  })

  const filtered = useMemo(() => {
    if (filter === 'live') return workouts.filter((w) => isLiveWorkoutStatus(w.status))
    if (filter === 'completed') return workouts.filter((w) => w.status === 'Completed')
    return workouts
  }, [filter, workouts])

  const liveCount = workouts.filter((w) => isLiveWorkoutStatus(w.status)).length
  const completedToday = workouts.filter((w) => {
    if (w.status !== 'Completed') return false
    const d = new Date(w.sessionDateUtc)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  const backHref = returnToSafe ?? '/dashboard'
  const backLabel = trainingReturnLabel(returnToSafe)

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="max-w-[1200px]">
        <header>
          <Link to={backHref} className="text-sm text-orange-400 hover:underline">
            ← {backLabel}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">Workouts to review</h1>
          <p className="mt-1 text-sm text-slate-400">
            Live tracking from your assigned clients — open a session to review sets and progress.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <HeroStat role="trainer" label="Live now" numericValue={isLoading ? 0 : liveCount} />
          <HeroStat
            role="trainer"
            label="Completed today"
            numericValue={isLoading ? 0 : completedToday}
          />
        </div>

        <GlassPanel role="trainer" title="Client workouts" subtitle="Most recent per client">
          <div className="mb-4 flex flex-wrap gap-2">
            {(['all', 'live', 'completed'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filter === value
                    ? 'bg-orange-500/25 text-orange-100 ring-1 ring-orange-400/40'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {value === 'all' ? 'All' : value === 'live' ? 'Live' : 'Completed'}
              </button>
            ))}
          </div>

          <ul className="divide-y divide-white/5">
            {filtered.map((w) => (
              <WorkoutReviewRow
                key={`${w.memberId}-${w.sessionId}`}
                workout={w}
                trainerId={trainerId}
                onReview={() => setReviewSessionId(w.sessionId)}
              />
            ))}
            {!isLoading && filtered.length === 0 ? (
              <li className="py-8 text-center text-sm text-slate-500">
                {filter === 'live'
                  ? 'No live workouts right now.'
                  : filter === 'completed'
                    ? 'No completed workouts to show.'
                    : 'No tracked workouts yet from your clients.'}
              </li>
            ) : null}
          </ul>
        </GlassPanel>

        <WorkoutSessionReviewModal
          sessionId={reviewSessionId}
          open={reviewSessionId != null}
          onClose={() => setReviewSessionId(null)}
        />
      </DashboardPageContent>
    </DashboardLayout>
  )
}

function WorkoutReviewRow({
  workout,
  trainerId,
  onReview,
}: {
  workout: MemberWorkoutSummary
  trainerId?: number
  onReview: () => void
}) {
  const returnTo = '/dashboard/training/workouts-to-review'
  const timelineHref = memberWorkoutTimelineUrl({
    memberId: workout.userId || workout.memberId,
    trainerId,
    returnTo,
  })
  const assignHref = workoutAssignmentUrl({
    userId: workout.userId,
    trainerId,
    returnTo,
  })

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={timelineHref} className="font-medium text-white hover:text-orange-300">
            {workout.memberName}
          </Link>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${workoutStatusClass(workout.status)}`}>
            {workoutStatusLabel(workout.status)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {workout.planName ?? 'Workout'} · {new Date(workout.sessionDateUtc).toLocaleString()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm text-orange-300">
          {workout.completionPercent != null ? `${Math.round(workout.completionPercent)}%` : '—'}
        </span>
        <button
          type="button"
          onClick={onReview}
          className="text-xs font-semibold text-orange-300 hover:underline"
        >
          Review sets
        </button>
        {workout.userId > 0 ? (
          <Link to={assignHref} className="text-xs font-semibold text-slate-400 hover:text-orange-300">
            Assign program
          </Link>
        ) : null}
      </div>
    </li>
  )
}
