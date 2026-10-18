import { useQuery } from '@tanstack/react-query'
import { Activity, CalendarDays, Check, CircleDashed, Clock3, Dumbbell, Layers3, LockKeyhole, NotebookPen, Weight } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import { workoutTrackingService } from '../../../services/workoutTracking.service'
import type { WorkoutSessionGroup } from '../../../types/workoutTracking'
import { isLiveWorkoutStatus, workoutStatusLabel } from '../lib/workoutSessionUi'
import './workoutSessionReview.css'

export function WorkoutSessionReviewModal({
  sessionId,
  open,
  onClose,
}: {
  sessionId: number | null
  open: boolean
  onClose: () => void
}) {
  const { data, isLoading, isError, error, refetch } = useQuery({
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
  const completion = Math.min(100, Math.max(0, session?.completionPercent ?? 0))
  const when = session?.startTimeUtc || session?.workoutDate
  const sessionDate = when ? new Date(when) : null
  const formattedDate = sessionDate && !Number.isNaN(sessionDate.getTime())
    ? sessionDate.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Date unavailable'

  return (
    <Modal open={open} onClose={onClose} title="Workout session review" size="wide" scrollable
      footer={<Button type="button" variant="secondary" onClick={onClose}>Back to history</Button>}>
      {isLoading ? (
        <p role="status" className="py-8 text-center text-sm text-slate-400">Loading session…</p>
      ) : isError ? (
        <div role="alert" className="space-y-3 py-6 text-sm text-slate-300"><p>{getApiErrorMessage(error, 'Could not load this session.')}</p><Button variant="secondary" onClick={() => void refetch()}>Retry</Button></div>
      ) : !session || !data ? (
        <p className="py-8 text-center text-sm text-slate-400">Session details are unavailable.</p>
      ) : (
        <div className="session-review space-y-5">
          <section className="session-review-hero">
            <div className="session-review-hero-main">
              <span className="session-review-eyebrow"><Activity size={14} aria-hidden="true" />SESSION PERFORMANCE</span>
              <h3>{session.planName || 'Workout session'}</h3>
              <div className="session-review-context"><span className={`session-review-status ${live ? 'live' : session.status === 'Completed' ? 'complete' : ''}`}><span />{live ? 'Live now' : workoutStatusLabel(session.status)}</span><span><CalendarDays size={12} aria-hidden="true" />{formattedDate}</span></div>
              <p className="session-review-readonly"><LockKeyhole size={11} aria-hidden="true" />Read only · {live ? 'Updates every 15 seconds' : 'Synced workout record'}</p>
            </div>
            <div className="session-review-ring" style={{ background: `conic-gradient(from -90deg, var(--session-accent) ${completion}%, var(--session-border) ${completion}% 100%)` }}>
              <div><strong>{Math.round(completion)}<small>%</small></strong><span>sets completed</span></div>
            </div>
          </section>
          <section className="session-review-metrics" aria-label="Session summary">
            <div><span><Layers3 size={15} aria-hidden="true" />Completed sets</span><p><strong>{session.completedSets}<small> / {session.totalSets}</small></strong></p></div>
            <div><span><Clock3 size={15} aria-hidden="true" />Duration</span><p><strong>{data.durationMinutes != null && data.durationMinutes > 0 ? data.durationMinutes : '—'}</strong><small>{data.durationMinutes != null && data.durationMinutes > 0 ? 'min' : 'unavailable'}</small></p></div>
            <div><span><Weight size={15} aria-hidden="true" />Recorded volume</span><p><strong>{data.totalVolume == null ? '—' : Math.round(data.totalVolume).toLocaleString()}</strong><small>{data.totalVolume == null ? 'unavailable' : 'kg'}</small></p></div>
          </section>
          {data.notes?.trim() && <aside className="session-review-notes"><NotebookPen size={17} aria-hidden="true" /><div><h4>Session notes</h4><p>{data.notes}</p></div></aside>}
          <div className="session-review-section-heading"><div><span className="session-review-eyebrow">THE SESSION BREAKDOWN</span><h4><Dumbbell size={18} aria-hidden="true" />Exercise performance</h4></div><span>{session.exercises.length} {session.exercises.length === 1 ? 'exercise' : 'exercises'}</span></div>
          <WorkoutSessionSetReview exercises={session.exercises} />
          <p className="session-review-footnote"><LockKeyhole size={12} aria-hidden="true" />Targets show the prescribed routine. Recorded values show synced performance; missing values stay unavailable.</p>
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
    return <p className="session-review-empty">No logged sets yet.</p>
  }

  return (
    <div className="session-review session-review-exercises">
      {exercises.map((group, index) => (
        <section key={group.exerciseId} className="session-review-exercise">
          <header><span className="session-review-exercise-number">{String(index + 1).padStart(2, '0')}</span><div><h5>{group.exerciseName}</h5><p>{group.sets.filter((set) => set.isCompleted).length} of {group.sets.length} sets completed</p></div><Dumbbell size={17} aria-hidden="true" /></header>
          <div className="session-review-table-head" aria-hidden="true"><span>SET</span><span>TARGET</span><span>RECORDED</span><span>STATUS</span></div>
          <ul className="session-review-sets">
            {group.sets.map((set) => (
              <li key={set.id} className="session-review-set">
                  <span className="session-review-set-number">Set {set.setNumber}</span>
                  <div className="session-review-target"><span className="session-review-mobile-label">Target</span><p>{formatTarget(set.targetReps, set.targetWeight)}</p></div>
                  <div className="session-review-actual"><span className="session-review-mobile-label">Recorded</span><p>{formatActual(set.actualReps, set.actualWeight)}</p></div>
                  {set.isCompleted ? (
                    <span className="session-review-set-status done"><Check size={13} aria-hidden="true" />Completed</span>
                  ) : (
                    <span className="session-review-set-status"><CircleDashed size={13} aria-hidden="true" />Pending</span>
                  )}
                  {set.notes?.trim() && <p className="session-review-set-note">{set.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
