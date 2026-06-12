import { useMemo, useState } from 'react'
import { Input } from '../../../components/ui/Input'
import type { Exercise } from '../../../types/exercise'
import type { ProgramDayDto, WorkoutPlanExercise } from '../../../types/workoutPlan'
import { nextTempId } from './tempIds'

type Props = {
  day: ProgramDayDto
  exerciseLibrary: Exercise[]
  onDayChange: (next: ProgramDayDto) => void
}

export function DayExercisePanel({ day, exerciseLibrary, onDayChange }: Props) {
  const [search, setSearch] = useState('')

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
    if (day.isRestDay) return
    patchExercises([
      ...day.exercises,
      {
        id: nextTempId(),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        videoUrl: exercise.videoUrl,
        bodyPartName: exercise.bodyPartName,
        sets: 3,
        reps: 10,
        restBetweenSets: 60,
        order: day.exercises.length + 1,
        weight: null,
        tempo: null,
        intensity: null,
        notes: null,
        workoutPlanDayId: day.id,
      },
    ])
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
          No lifting block for {day.dayName}. Mark as training day to add exercises.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[320px] flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">{day.dayName}</p>
        <p className="text-sm text-slate-300">
          {day.focusArea ?? 'Training day'} · members see this workout on calendar day {day.dayNumber}{' '}
          (Mon=1 … Sun=7)
        </p>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercise or body part…"
          />
          <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
            {pickerResults.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => addExercise(exercise)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-3 py-2 text-left text-sm text-slate-200 transition hover:border-cyan-500/30 hover:bg-cyan-500/10"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{exercise.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {exercise.bodyPartName ?? 'General'}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                  + Add
                </span>
              </button>
            ))}
            {pickerResults.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-slate-500">
                {exerciseLibrary.length === 0
                  ? 'No exercises in the library.'
                  : 'No matches — try another search.'}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Exercises ({day.exercises.length})
          </p>
          {day.exercises.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-xs text-slate-500">
              Add exercises for this training day.
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {day.exercises.map((row, index) => {
                const meta = exerciseById.get(row.exerciseId)
                const label = row.exerciseName || meta?.name || `Exercise #${row.exerciseId}`
                return (
                  <div
                    key={`${row.exerciseId}-${row.id}-${index}`}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-white">
                        {index + 1}. {label}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveRow(index, -1)}
                          disabled={index === 0}
                          className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRow(index, 1)}
                          disabled={index === day.exercises.length - 1}
                          className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="rounded-md px-1.5 py-0.5 text-xs text-rose-300 transition hover:bg-rose-500/15"
                          aria-label="Remove"
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
    </div>
  )
}
