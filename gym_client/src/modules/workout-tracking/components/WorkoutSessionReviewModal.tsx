import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { workoutTrackingService } from '../../../services/workoutTracking.service'
import type { WorkoutSessionGroup } from '../../../types/workoutTracking'
import { isLiveWorkoutStatus, workoutStatusLabel } from '../lib/workoutSessionUi'

export function WorkoutSessionReviewModal({
  sessionId,
  open,
  onClose,
}: {
  sessionId: number | null
  open: boolean
  onClose: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['workout-session-detail', sessionId],
    enabled: open && sessionId != null && sessionId > 0,
    queryFn: async () => {
      const { data: payload } = await workoutTrackingService.sessionDetail(sessionId!)
      return payload
    },
    refetchInterval: (query) =>
      isLiveWorkoutStatus(query.state.data?.session.status ?? '') ? 15_000 : false,
  })

  const session = data?.session
  const live = isLiveWorkoutStatus(session?.status ?? '')

  return (
    <Modal open={open} onClose={onClose} title={session?.planName ?? 'Workout session'} size="wide" scrollable>
      {isLoading || !session || !data ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading session…</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                live
                  ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                  : 'border border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              {live ? 'Live now' : workoutStatusLabel(session.status)}
            </span>
            <span className="text-slate-400">
              {Math.round(session.completionPercent)}% · {session.completedSets}/{session.totalSets} sets
            </span>
            {data.durationMinutes != null && data.durationMinutes > 0 ? (
              <span className="text-slate-500">{data.durationMinutes} min</span>
            ) : (
              <span className="text-slate-500">Duration unavailable</span>
            )}
            <span className="text-slate-500">
              {data.totalVolume == null ? 'Volume unavailable' : `${Math.round(data.totalVolume)} kg volume`}
            </span>
          </div>

          {data.notes?.trim() ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
              {data.notes}
            </p>
          ) : null}

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
              style={{ width: `${Math.min(100, session.completionPercent)}%` }}
            />
          </div>

          <WorkoutSessionSetReview exercises={session.exercises} />
        </div>
      )}
    </Modal>
  )
}

function formatTarget(reps: number, weight?: number | null) {
  return weight == null ? `${reps} reps` : `${reps} reps @ ${weight} kg`
}

function formatActual(reps?: number | null, weight?: number | null) {
  if (reps == null && weight == null) return 'Unavailable'
  const repText = reps == null ? 'reps unavailable' : `${reps} reps`
  const weightText = weight == null ? 'weight unavailable' : `${weight} kg`
  return `${repText} @ ${weightText}`
}

export function WorkoutSessionSetReview({
  exercises,
}: {
  exercises: WorkoutSessionGroup[]
}) {
  if (!exercises.length) {
    return <p className="py-6 text-center text-sm text-slate-500">No logged sets yet.</p>
  }

  return (
    <div className="space-y-4">
      {exercises.map((group) => (
        <div key={group.exerciseId} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-medium text-white">{group.exerciseName}</p>
          <ul className="mt-3 space-y-2">
            {group.sets.map((set) => (
              <li key={set.id} className="rounded-lg border border-white/5 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-slate-400">Set {set.setNumber}</p>
                    <p className="mt-1 text-slate-500">Target {formatTarget(set.targetReps, set.targetWeight)}</p>
                    <p className="text-slate-200">Recorded {formatActual(set.actualReps, set.actualWeight)}</p>
                    {set.notes?.trim() ? <p className="mt-1 text-xs text-slate-400">{set.notes}</p> : null}
                  </div>
                  {set.isCompleted ? (
                    <Check className="size-4 shrink-0 text-emerald-400" aria-label="Completed" />
                  ) : (
                    <span className="text-xs text-slate-500">Pending</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
