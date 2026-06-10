import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { Exercise } from '../../../types/exercise'
import type { Stretch } from '../../../types/stretch'
import type { Warmup } from '../../../types/warmup'
import { DAY_LABELS, FOCUS_AREAS, type WizardDayDraft, type WizardExerciseLine } from '../types'

interface Props {
  day: WizardDayDraft
  exercises: Exercise[]
  warmups: Warmup[]
  stretches: Stretch[]
  onClose: () => void
  onChange: (day: WizardDayDraft) => void
}

function newClientKey() {
  return `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function DayConfigDrawer({ day, exercises, warmups, stretches, onClose, onChange }: Props) {
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [warmupSearch, setWarmupSearch] = useState('')
  const [stretchSearch, setStretchSearch] = useState('')

  const isRest = day.isRestDay || day.focusArea === 'Rest Day'

  const filteredExercises = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase()
    if (!q) return exercises.slice(0, 40)
    return exercises.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 40)
  }, [exerciseSearch, exercises])

  const filteredWarmups = useMemo(() => {
    const q = warmupSearch.trim().toLowerCase()
    if (!q) return warmups.slice(0, 30)
    return warmups.filter((w) => w.name.toLowerCase().includes(q)).slice(0, 30)
  }, [warmupSearch, warmups])

  const filteredStretches = useMemo(() => {
    const q = stretchSearch.trim().toLowerCase()
    if (!q) return stretches.slice(0, 30)
    return stretches.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 30)
  }, [stretchSearch, stretches])

  function patch(partial: Partial<WizardDayDraft>) {
    onChange({ ...day, ...partial })
  }

  function addExercise(ex: Exercise) {
    const line: WizardExerciseLine = {
      clientKey: newClientKey(),
      exerciseId: ex.id,
      exerciseName: ex.name,
      sets: 3,
      reps: 10,
      restBetweenSets: 60,
      order: day.exercises.length + 1,
    }
    patch({ exercises: [...day.exercises, line] })
  }

  function updateExercise(key: string, partial: Partial<WizardExerciseLine>) {
    patch({
      exercises: day.exercises.map((e) => (e.clientKey === key ? { ...e, ...partial } : e)),
    })
  }

  function removeExercise(key: string) {
    patch({ exercises: day.exercises.filter((e) => e.clientKey !== key) })
  }

  function toggleWarmup(id: number) {
    const exists = day.warmups.some((w) => w.warmupId === id)
    if (exists) {
      patch({
        warmups: day.warmups.filter((w) => w.warmupId !== id).map((w, i) => ({ ...w, displayOrder: i + 1 })),
      })
    } else {
      patch({ warmups: [...day.warmups, { warmupId: id, displayOrder: day.warmups.length + 1 }] })
    }
  }

  function toggleStretch(id: number) {
    const exists = day.stretches.some((s) => s.stretchId === id)
    if (exists) {
      patch({
        stretches: day.stretches.filter((s) => s.stretchId !== id).map((s, i) => ({ ...s, displayOrder: i + 1 })),
      })
    } else {
      patch({ stretches: [...day.stretches, { stretchId: id, displayOrder: day.stretches.length + 1 }] })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Day configuration</p>
            <p className="text-lg font-semibold text-white">
              {DAY_LABELS[day.dayNumber - 1]} — {day.name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Focus area
            <select
              value={day.focusArea}
              onChange={(e) => {
                const focus = e.target.value
                patch({
                  focusArea: focus,
                  isRestDay: focus === 'Rest Day',
                  name: focus === 'Rest Day' ? 'Rest' : focus || day.name,
                })
              }}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="">Select focus</option>
              {FOCUS_AREAS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          {isRest ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              Recovery day — no exercises, warmups, or stretches. Members see a rest message in the app.
            </div>
          ) : (
            <>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-white">Warmups</h3>
                <input
                  value={warmupSearch}
                  onChange={(e) => setWarmupSearch(e.target.value)}
                  placeholder="Search warmups…"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {filteredWarmups.map((w) => {
                    const on = day.warmups.some((x) => x.warmupId === w.id)
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleWarmup(w.id)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                          on ? 'border-sky-400/40 bg-sky-500/10 text-sky-100' : 'border-white/10 text-slate-300'
                        }`}
                      >
                        <span>{w.name}</span>
                        <span className="text-xs text-slate-400">{w.durationSeconds}s</span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-white">Exercises</h3>
                <input
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Search exercises…"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
                <div className="max-h-28 space-y-1 overflow-y-auto">
                  {filteredExercises.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => addExercise(ex)}
                      className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-slate-200 hover:border-sky-400/30"
                    >
                      + {ex.name}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {day.exercises.map((ex) => (
                    <div key={ex.clientKey} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">{ex.exerciseName}</p>
                        <button type="button" onClick={() => removeExercise(ex.clientKey)} className="text-xs text-rose-300">
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <label className="text-[10px] text-slate-400">
                          Sets
                          <input
                            type="number"
                            min={1}
                            value={ex.sets}
                            onChange={(e) => updateExercise(ex.clientKey, { sets: Number(e.target.value) || 1 })}
                            className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-sm text-white"
                          />
                        </label>
                        <label className="text-[10px] text-slate-400">
                          Reps
                          <input
                            type="number"
                            min={1}
                            value={ex.reps}
                            onChange={(e) => updateExercise(ex.clientKey, { reps: Number(e.target.value) || 1 })}
                            className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-sm text-white"
                          />
                        </label>
                        <label className="text-[10px] text-slate-400">
                          Rest (s)
                          <input
                            type="number"
                            min={0}
                            value={ex.restBetweenSets}
                            onChange={(e) => updateExercise(ex.clientKey, { restBetweenSets: Number(e.target.value) || 0 })}
                            className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-sm text-white"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-white">Stretches</h3>
                <input
                  value={stretchSearch}
                  onChange={(e) => setStretchSearch(e.target.value)}
                  placeholder="Search stretches…"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {filteredStretches.map((s) => {
                    const on = day.stretches.some((x) => x.stretchId === s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStretch(s.id)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                          on ? 'border-violet-400/40 bg-violet-500/10 text-violet-100' : 'border-white/10 text-slate-300'
                        }`}
                      >
                        <span>{s.name}</span>
                        <span className="text-xs text-slate-400">{s.durationSeconds}s</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
