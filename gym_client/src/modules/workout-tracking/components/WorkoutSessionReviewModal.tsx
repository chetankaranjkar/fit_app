import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { workoutTrackingService } from '../../../services/workoutTracking.service'
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
      {isLoading || !session ? (
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
            {data.durationMinutes > 0 ? (
              <span className="text-slate-500">{data.durationMinutes} min</span>
            ) : null}
            <span className="text-slate-500">{Math.round(data.totalVolume)} kg volume</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
              style={{ width: `${Math.min(100, session.completionPercent)}%` }}
            />
          </div>

          <div className="space-y-4">
            {session.exercises.map((group) => (
              <div key={group.exerciseId} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-white">{group.exerciseName}</p>
                <ul className="mt-3 space-y-2">
                  {group.sets.map((set) => (
                    <li
                      key={set.id}
                      className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm"
                    >
                      <span className="text-slate-400">Set {set.setNumber}</span>
                      <span className="text-slate-200">
                        {set.actualReps ?? set.targetReps} reps
                        {set.actualWeight != null || set.targetWeight != null
                          ? ` @ ${set.actualWeight ?? set.targetWeight} kg`
                          : ''}
                      </span>
                      {set.isCompleted ? (
                        <Check className="size-4 text-emerald-400" aria-label="Completed" />
                      ) : (
                        <span className="text-xs text-slate-500">Pending</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!session.exercises.length ? (
              <p className="py-6 text-center text-sm text-slate-500">No logged sets yet.</p>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  )
}
