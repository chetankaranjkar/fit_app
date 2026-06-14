import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
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
import { workoutTrackingService } from '../../services/workoutTracking.service'
import { WorkoutSessionReviewModal } from '../../modules/workout-tracking/components/WorkoutSessionReviewModal'
import {
  isLiveWorkoutStatus,
  workoutStatusClass,
  workoutStatusLabel,
} from '../../modules/workout-tracking/lib/workoutSessionUi'

export function TrainerMemberWorkoutTimelinePage() {
  const { memberId } = useParams<{ memberId: string }>()
  const [searchParams] = useSearchParams()
  const id = Number(memberId)
  const presetTrainerId = Number.parseInt(searchParams.get('trainerId') ?? '', 10)
  const returnToSafe = useMemo(
    () => getSafeDashboardReturnPath(searchParams.get('returnTo')),
    [searchParams],
  )
  const { userName } = getDashboardUser()
  const [reviewSessionId, setReviewSessionId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['trainer-member-timeline', id],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async () => {
      const { data: payload } = await workoutTrackingService.trainerMemberTimeline(id)
      return payload
    },
    refetchInterval: (query) =>
      (query.state.data?.sessions ?? []).some((s) => isLiveWorkoutStatus(s.status)) ? 20_000 : false,
  })

  const liveCount = (data?.sessions ?? []).filter((s) => isLiveWorkoutStatus(s.status)).length
  const backHref = returnToSafe ?? '/dashboard'
  const backLabel = trainingReturnLabel(returnToSafe)
  const trainerId = Number.isFinite(presetTrainerId) && presetTrainerId > 0 ? presetTrainerId : undefined
  const assignUserId = data?.userId && data.userId > 0 ? data.userId : id
  const returnTo =
    returnToSafe ??
    memberWorkoutTimelineUrl({
      memberId: id,
      trainerId,
    })

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="max-w-[1100px]">
        <header>
          <Link to={backHref} className="text-sm text-orange-400 hover:underline">
            ← {backLabel}
          </Link>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {isLoading ? 'Loading…' : data?.memberName ?? 'Member workouts'}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Live tracking timeline · adherence {data?.adherencePercent ?? 0}% this week ·{' '}
                {data?.completedThisWeek ?? 0} completed
              </p>
            </div>
            {assignUserId > 0 ? (
              <Link
                to={workoutAssignmentUrl({
                  userId: assignUserId,
                  trainerId,
                  returnTo,
                })}
                className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Assign program
              </Link>
            ) : null}
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <HeroStat
            role="trainer"
            label="Adherence this week"
            numericValue={isLoading ? 0 : Number(data?.adherencePercent ?? 0)}
            format={(n) => `${n}%`}
          />
          <HeroStat
            role="trainer"
            label="Completed this week"
            numericValue={isLoading ? 0 : data?.completedThisWeek ?? 0}
          />
          <HeroStat role="trainer" label="Live sessions" numericValue={isLoading ? 0 : liveCount} />
        </div>

        <GlassPanel role="trainer" title="Recent sessions" subtitle="Click a session to review sets">
          <ul className="divide-y divide-white/5">
            {(data?.sessions ?? []).map((s) => (
              <li key={s.sessionId}>
                <button
                  type="button"
                  onClick={() => setReviewSessionId(s.sessionId)}
                  className="flex w-full items-center justify-between py-3 text-left text-sm transition hover:bg-white/[0.02]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{s.planName ?? 'Workout'}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${workoutStatusClass(s.status)}`}
                      >
                        {workoutStatusLabel(s.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(s.sessionDateUtc).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-300">
                      {s.completionPercent != null ? `${Math.round(s.completionPercent)}%` : '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.totalVolume != null ? `${Math.round(s.totalVolume)} kg` : 'Review sets →'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
            {!isLoading && !(data?.sessions?.length) ? (
              <li className="py-8 text-center text-slate-500">No tracked workouts yet.</li>
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
