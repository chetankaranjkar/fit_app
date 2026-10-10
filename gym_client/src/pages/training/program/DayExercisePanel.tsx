import { useMemo, useState } from 'react'
import { ExerciseLibraryUnavailableBanner } from '../../../components/training/ExerciseLibraryUnavailableBanner'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import type { Exercise } from '../../../types/exercise'
import type { ProgramDayDto, WorkoutPlanExercise } from '../../../types/workoutPlan'
import { nextTempId } from './tempIds'
import { cleanScheduleText } from './scheduleText'

type Props = {
  day: ProgramDayDto
  exerciseLibrary: Exercise[]
  onDayChange: (next: ProgramDayDto) => void
  libraryError?: unknown
  onRetryLibrary?: () => void
  libraryRetrying?: boolean
}

export function DayExercisePanel({
  day,
  exerciseLibrary,
  onDayChange,
  libraryError,
  onRetryLibrary,
  libraryRetrying,
}: Props) {
  const [search, setSearch] = useState('')
  const [pendingExercise, setPendingExercise] = useState<Exercise | null>(null)
  const [prescription, setPrescription] = useState({ sets: '3', reps: '10', rest: '60' })

  const exerciseById = useMemo(
    () => new Map(exerciseLibrary.map((e) => [e.id, e])),
    [exerciseLibrary],
  )

  const pickerResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    const chosen = new Set(day.exercises.map((e) => e.exerciseId))
    return exerciseLibrary
      .filter((e) => !chosen.has(e.id))
      .filter(
        (e) =>
          q.length === 0 ||
          e.name.toLowerCase().includes(q) ||
          (e.bodyPartName ?? '').toLowerCase().includes(q),
      )
      .slice(0, 24)
  }, [day.exercises, exerciseLibrary, search])

  function patchExercises(next: WorkoutPlanExercise[]) {
    onDayChange({
      ...day,
      exercises: next.map((e, i) => ({ ...e, order: i + 1 })),
    })
  }

  function addExercise(exercise: Exercise) {
    if (day.isRestDay || day.exercises.some((row) => row.exerciseId === exercise.id)) return
    patchExercises([
      ...day.exercises,
      {
        id: nextTempId(),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        videoUrl: exercise.videoUrl,
        bodyPartName: exercise.bodyPartName,
        sets: Number(prescription.sets),
        reps: Number(prescription.reps),
        restBetweenSets: Number(prescription.rest),
        order: day.exercises.length + 1,
        weight: null,
        tempo: null,
        intensity: null,
        notes: null,
        workoutPlanDayId: day.id,
      },
    ])
    setPendingExercise(null)
  }

  function updateRow(index: number, field: 'sets' | 'reps' | 'restBetweenSets', value: number) {
    patchExercises(
      day.exercises.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    )
  }

  function removeRow(index: number) {
    patchExercises(day.exercises.filter((_, i) => i !== index))
  }

  function moveRow(index: number, delta: -1 | 1) {
    const next = [...day.exercises]
    const j = index + delta
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j], next[index]]
    patchExercises(next)
  }

  if (day.isRestDay) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
        <p className="text-sm font-medium text-emerald-200">Rest day</p>
        <p className="mt-2 max-w-sm text-xs text-slate-400">
          No lifting block for {cleanScheduleText(day.dayName)}. Mark as training day to add exercises.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 sm:p-5">
      <div>
        <h3 className="text-lg font-semibold text-[var(--dashboard-text)] [overflow-wrap:anywhere]">{cleanScheduleText(day.dayName)}</h3>
        <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
          Build this day's workout. Review each exercise before adding it, then save the schedule.
        </p>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 self-start rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-muted)] p-3">
          <h4 className="mb-3 text-sm font-semibold text-[var(--dashboard-text)]">Exercise library</h4>
          <Input
            aria-label="Search exercise library"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercise or body part…"
          />
          <div className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto pr-1">
            {libraryError && onRetryLibrary ? (
              <div className="mb-2">
                <ExerciseLibraryUnavailableBanner
                  error={libraryError}
                  onRetry={onRetryLibrary}
                  isRetrying={libraryRetrying}
                />
              </div>
            ) : null}
            {pickerResults.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => {
                  setPrescription({ sets: '3', reps: '10', rest: '60' })
                  setPendingExercise(exercise)
                }}
                aria-label={`Add ${exercise.name}`}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-2 py-3 text-left text-sm text-[var(--dashboard-text)] transition hover:border-cyan-500/30 hover:bg-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <span className="min-w-0">
                  <span className="block font-medium [overflow-wrap:anywhere]">{exercise.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {exercise.bodyPartName ?? 'General'}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                  + Add
                </span>
              </button>
            ))}
            {pickerResults.length === 0 && !libraryError && (
              <p className="px-3 py-6 text-center text-xs text-slate-500">
                {exerciseLibrary.length === 0
                  ? 'No exercises in the library.'
                  : search.trim()
                    ? 'No matches — try another search.'
                    : 'All available exercises are already in this workout.'}
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <h4 className="text-sm font-semibold text-[var(--dashboard-text)]">
            Workout exercises <span className="ml-1 text-[var(--dashboard-muted)]">({day.exercises.length})</span>
          </h4>
          {day.exercises.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-xs text-slate-500">
              Add exercises for this training day.
            </div>
          ) : (
            <div className="space-y-3">
              {day.exercises.map((row, index) => {
                const meta = exerciseById.get(row.exerciseId)
                const label = row.exerciseName || meta?.name || `Exercise #${row.exerciseId}`
                return (
                  <div
                    key={`${row.exerciseId}-${row.id}-${index}`}
                    className="rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-muted)] p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm font-semibold text-[var(--dashboard-text)] [overflow-wrap:anywhere]">
                        {index + 1}. {label}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveRow(index, -1)}
                          disabled={index === 0}
                          className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                          aria-label={`Move ${label} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRow(index, 1)}
                          disabled={index === day.exercises.length - 1}
                          className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                          aria-label={`Move ${label} down`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="rounded-md px-1.5 py-0.5 text-xs text-rose-300 transition hover:bg-rose-500/15"
                          aria-label={`Remove ${label}`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        label="Sets"
                        type="number"
                        min={1}
                        value={String(row.sets)}
                        onChange={(e) => updateRow(index, 'sets', Number(e.target.value) || 0)}
                      />
                      <Input
                        label="Reps"
                        type="number"
                        min={1}
                        value={String(row.reps)}
                        onChange={(e) => updateRow(index, 'reps', Number(e.target.value) || 0)}
                      />
                      <Input
                        label="Rest (s)"
                        type="number"
                        min={0}
                        value={String(row.restBetweenSets)}
                        onChange={(e) =>
                          updateRow(index, 'restBetweenSets', Number(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Modal open={pendingExercise !== null} onClose={() => setPendingExercise(null)} title="Add exercise">
        {pendingExercise ? (
          <form className="space-y-5" onSubmit={(event) => {
            event.preventDefault()
            addExercise(pendingExercise)
          }}>
            <div className="rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-muted)] p-4">
              <p className="font-semibold text-[var(--dashboard-text)]">{pendingExercise.name}</p>
              <p className="mt-1 text-sm text-[var(--dashboard-muted)]">{pendingExercise.bodyPartName ?? 'General'} · {cleanScheduleText(day.dayName)}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Sets" type="number" min={1} step={1} required value={prescription.sets} onChange={(event) => setPrescription({ ...prescription, sets: event.target.value })} />
              <Input label="Reps" type="number" min={1} step={1} required value={prescription.reps} onChange={(event) => setPrescription({ ...prescription, reps: event.target.value })} />
              <Input label="Rest (s)" type="number" min={0} step={1} required value={prescription.rest} onChange={(event) => setPrescription({ ...prescription, rest: event.target.value })} />
            </div>
            <p className="text-xs text-[var(--dashboard-muted)]">This adds the exercise to your draft. Save schedule to apply your changes.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPendingExercise(null)}>Cancel</Button>
              <Button type="submit">Confirm addition</Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}
