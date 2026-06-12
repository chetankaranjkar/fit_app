import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import type { Exercise } from '../../../types/exercise'
import type { Trainer } from '../../../types/trainer'
import type {
  CreateWorkoutPlanDto,
  CreateWorkoutPlanExerciseDto,
  ProgramGoal,
  WorkoutPlan,
  WorkoutType,
} from '../../../types/workoutPlan'

export const PROGRAM_GOALS: ProgramGoal[] = [
  'Muscle Gain',
  'Fat Loss',
  'Strength',
  'Mobility',
  'Endurance',
  'HIIT',
  'Athletic Performance',
  'Beginner Fitness',
]

const DURATION_OPTIONS = [30, 60, 90, 120] as const
const FREQ_OPTIONS = [3, 4, 5, 6] as const
const WORKOUT_TYPES: WorkoutType[] = ['Warmup', 'ShortHIIT', 'LongHIIT', 'Strength', 'Cardio']
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const
const STATUSES = ['Draft', 'Active', 'Archived'] as const

const GOAL_ICONS: Record<ProgramGoal, string> = {
  'Muscle Gain': '💪',
  'Fat Loss': '🔥',
  Strength: '🏋️',
  Mobility: '🧘',
  Endurance: '🏃',
  HIIT: '⚡',
  'Athletic Performance': '🥇',
  'Beginner Fitness': '🌱',
}

export type ProgramFormState = {
  name: string
  description: string
  goal: string
  workoutType: WorkoutType
  duration: number
  durationDays: number
  workoutsPerWeek: number
  difficultyLevel: string
  trainerId: number
  thumbnail: string
  tags: string
  status: string
  isPublic: boolean
  workoutCategoryId: number
  exercises: CreateWorkoutPlanExerciseDto[]
}

export const defaultProgramForm: ProgramFormState = {
  name: '',
  description: '',
  goal: 'Muscle Gain',
  workoutType: 'Strength',
  duration: 50,
  durationDays: 90,
  workoutsPerWeek: 4,
  difficultyLevel: 'Beginner',
  trainerId: 0,
  thumbnail: '',
  tags: '',
  status: 'Active',
  isPublic: false,
  workoutCategoryId: 0,
  exercises: [],
}

export function planToProgramForm(plan: WorkoutPlan): ProgramFormState {
  return {
    name: plan.name,
    description: plan.description ?? '',
    goal: plan.goal ?? 'Muscle Gain',
    workoutType: plan.workoutType,
    duration: plan.duration,
    durationDays: plan.durationDays ?? 90,
    workoutsPerWeek: plan.workoutsPerWeek ?? 4,
    difficultyLevel: plan.difficultyLevel,
    trainerId: plan.trainerId ?? 0,
    thumbnail: plan.thumbnail ?? '',
    tags: (plan.tags ?? []).join(', '),
    status: plan.status ?? 'Active',
    isPublic: plan.isPublic,
    workoutCategoryId: plan.workoutCategoryId ?? 0,
    exercises: [...plan.exercises]
      .sort((a, b) => a.order - b.order)
      .map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
        reps: exercise.reps,
        restBetweenSets: exercise.restBetweenSets,
        order: exercise.order,
        weight: exercise.weight ?? null,
        tempo: exercise.tempo ?? null,
        intensity: exercise.intensity ?? null,
        notes: exercise.notes ?? null,
      })),
  }
}

export function programFormToPayload(form: ProgramFormState): CreateWorkoutPlanDto {
  const tags = form.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    goal: form.goal.trim() || null,
    workoutType: form.workoutType,
    duration: form.duration,
    durationDays: form.durationDays,
    workoutsPerWeek: form.workoutsPerWeek,
    difficultyLevel: form.difficultyLevel,
    trainerId: form.trainerId > 0 ? form.trainerId : null,
    thumbnail: form.thumbnail.trim() || null,
    tags: tags.length ? tags : null,
    status: form.status.trim() || 'Active',
    isPublic: form.isPublic,
    workoutCategoryId: form.workoutCategoryId > 0 ? form.workoutCategoryId : null,
    useDefaultWarmups: true,
    useDefaultStretches: true,
    exercises: form.exercises
      .filter((exercise) => exercise.exerciseId > 0)
      .map((exercise, index) => ({ ...exercise, order: index + 1 })),
  }
}

const STEPS = ['Basics', 'Schedule', 'Exercises'] as const
type Step = 0 | 1 | 2

function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  render,
}: {
  options: readonly T[]
  value: T
  onChange: (next: T) => void
  render?: (option: T) => React.ReactNode
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={String(option)}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
              active
                ? 'border-transparent bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] text-white shadow-lg shadow-purple-500/20'
                : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07]'
            }`}
          >
            {render ? render(option) : option}
          </button>
        )
      })}
    </div>
  )
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{children}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function ProgramWizard({
  open,
  editing,
  initialForm,
  exercises,
  categories,
  trainers,
  error,
  isSaving,
  onClose,
  onSubmit,
}: {
  open: boolean
  editing: boolean
  initialForm: ProgramFormState
  exercises: Exercise[]
  categories: { id: number; name: string }[]
  trainers: Trainer[]
  error: string | null
  isSaving: boolean
  onClose: () => void
  onSubmit: (form: ProgramFormState) => void
}) {
  const [step, setStep] = useState<Step>(0)
  const [form, setForm] = useState<ProgramFormState>(initialForm)
  const [stepError, setStepError] = useState<string | null>(null)
  const [exerciseSearch, setExerciseSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(initialForm)
    setStep(0)
    setStepError(null)
    setExerciseSearch('')
  }, [open, initialForm])

  useEffect(() => {
    if (!open || editing || categories.length === 0) return
    setForm((current) =>
      current.workoutCategoryId > 0 ? current : { ...current, workoutCategoryId: categories[0].id },
    )
  }, [open, editing, categories])

  const categoryRequired = !editing && categories.length > 0

  const set = <K extends keyof ProgramFormState>(key: K, value: ProgramFormState[K]) => {
    setStepError(null)
    setForm((c) => ({ ...c, [key]: value }))
  }

  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const pickerResults = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase()
    const chosen = new Set(form.exercises.map((e) => e.exerciseId))
    return exercises
      .filter((e) => !chosen.has(e.id))
      .filter(
        (e) =>
          q.length === 0 ||
          e.name.toLowerCase().includes(q) ||
          (e.bodyPartName ?? '').toLowerCase().includes(q),
      )
      .slice(0, 30)
  }, [exercises, exerciseSearch, form.exercises])

  function validateStep(target: Step): string | null {
    if (target > step && step === 0) {
      if (!form.name.trim()) return 'Program name is required.'
      if (categoryRequired && form.workoutCategoryId <= 0) return 'Pick a workout category.'
    }
    return null
  }

  function goTo(next: Step) {
    if (next > step) {
      const problem = validateStep(next)
      if (problem) {
        setStepError(problem)
        return
      }
    }
    setStepError(null)
    setStep(next)
  }

  function addExercise(exercise: Exercise) {
    setStepError(null)
    setForm((c) => ({
      ...c,
      exercises: [
        ...c.exercises,
        {
          exerciseId: exercise.id,
          sets: 3,
          reps: 10,
          restBetweenSets: 60,
          order: c.exercises.length + 1,
          weight: null,
        },
      ],
    }))
  }

  function updateExercise(index: number, field: keyof CreateWorkoutPlanExerciseDto, value: number) {
    setForm((c) => ({
      ...c,
      exercises: c.exercises.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    }))
  }

  function removeExercise(index: number) {
    setForm((c) => ({
      ...c,
      exercises: c.exercises
        .filter((_, i) => i !== index)
        .map((e, i) => ({ ...e, order: i + 1 })),
    }))
  }

  function moveExercise(index: number, delta: -1 | 1) {
    setForm((c) => {
      const next = [...c.exercises]
      const j = index + delta
      if (j < 0 || j >= next.length) return c
      ;[next[index], next[j]] = [next[j], next[index]]
      return { ...c, exercises: next.map((e, i) => ({ ...e, order: i + 1 })) }
    })
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setStepError('Program name is required.')
      setStep(0)
      return
    }
    if (categoryRequired && form.workoutCategoryId <= 0) {
      setStepError('Pick a workout category.')
      setStep(0)
      return
    }
    onSubmit(form)
  }

  const trainerLabel = (trainer: Trainer) => {
    const name = `${trainer.firstName ?? ''} ${trainer.lastName ?? ''}`.trim()
    return name || `Trainer #${trainer.id}`
  }

  const selectClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

  const displayError = stepError ?? error

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit program' : 'Create program'}
      size="wide"
      scrollable
      closeOnBackdropClick={false}
    >
      <div className="space-y-5">
        {/* Step rail */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const isActive = i === step
            const isDone = i < step
            return (
              <button
                key={label}
                type="button"
                onClick={() => goTo(i as Step)}
                className={`flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                  isActive
                    ? 'border-blue-400/40 bg-blue-500/10'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : isActive
                        ? 'bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] text-white'
                        : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <span
                  className={`hidden text-sm font-medium sm:block ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        {displayError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          >
            {displayError}
          </div>
        )}

        {/* STEP 1 — Basics */}
        {step === 0 && (
          <div className="space-y-5">
            <Input
              label="Program name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. 12-Week Hypertrophy Block"
              autoFocus
            />

            <div>
              <FieldLabel>Goal</FieldLabel>
              <ChipGroup
                options={PROGRAM_GOALS}
                value={form.goal as ProgramGoal}
                onChange={(g) => set('goal', g)}
                render={(g) => (
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden>{GOAL_ICONS[g]}</span>
                    {g}
                  </span>
                )}
              />
            </div>

            <div>
              <FieldLabel hint="Default warmups and stretches load from the selected category.">
                Workout category {categoryRequired ? '*' : ''}
              </FieldLabel>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const active = form.workoutCategoryId === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => set('workoutCategoryId', cat.id)}
                      className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                        active
                          ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  )
                })}
                {categories.length === 0 && (
                  <p className="text-sm text-amber-200/90">
                    No workout categories yet — you can still create the program, then add a category under
                    Training → Workout categories and assign it on the program detail page.
                  </p>
                )}
              </div>
              {categoryRequired && form.workoutCategoryId > 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  Selected: {categories.find((c) => c.id === form.workoutCategoryId)?.name ?? '—'}
                </p>
              ) : null}
            </div>

            <div>
              <FieldLabel>Difficulty</FieldLabel>
              <ChipGroup
                options={DIFFICULTIES}
                value={form.difficultyLevel as (typeof DIFFICULTIES)[number]}
                onChange={(d) => set('difficultyLevel', d)}
              />
            </div>

            <div>
              <FieldLabel>Description</FieldLabel>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="What is this program about? Who is it for?"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
          </div>
        )}

        {/* STEP 2 — Schedule */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel>Program length</FieldLabel>
                <ChipGroup
                  options={DURATION_OPTIONS}
                  value={form.durationDays as (typeof DURATION_OPTIONS)[number]}
                  onChange={(d) => set('durationDays', d)}
                  render={(d) => `${d} days`}
                />
              </div>
              <div>
                <FieldLabel>Workouts per week</FieldLabel>
                <ChipGroup
                  options={FREQ_OPTIONS}
                  value={form.workoutsPerWeek as (typeof FREQ_OPTIONS)[number]}
                  onChange={(d) => set('workoutsPerWeek', d)}
                  render={(d) => `${d}×`}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Workout type</FieldLabel>
              <ChipGroup
                options={WORKOUT_TYPES}
                value={form.workoutType}
                onChange={(t) => set('workoutType', t)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Avg session (minutes)"
                type="number"
                min={5}
                value={String(form.duration)}
                onChange={(e) => set('duration', Number(e.target.value) || 0)}
              />
              <div>
                <FieldLabel>Trainer</FieldLabel>
                <select
                  value={form.trainerId}
                  onChange={(e) => set('trainerId', Number(e.target.value))}
                  className={selectClass}
                >
                  <option value={0} className="bg-slate-900">
                    Unassigned
                  </option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id} className="bg-slate-900">
                      {trainerLabel(trainer)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <FieldLabel>Status</FieldLabel>
              <ChipGroup
                options={STATUSES}
                value={form.status as (typeof STATUSES)[number]}
                onChange={(s) => set('status', s)}
              />
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.05]">
              <div>
                <p className="text-sm font-medium text-slate-200">Public catalog</p>
                <p className="text-xs text-slate-500">Members can discover and browse this program.</p>
              </div>
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                  form.isPublic ? 'bg-[linear-gradient(135deg,#3b82f6,#a855f7)]' : 'bg-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => set('isPublic', e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={`inline-block size-4 transform rounded-full bg-white transition ${
                    form.isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label="Thumbnail URL"
                  value={form.thumbnail}
                  onChange={(e) => set('thumbnail', e.target.value)}
                  placeholder="https://…"
                />
                <Input
                  label="Tags (comma separated)"
                  value={form.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  placeholder="push-pull, hypertrophy"
                />
              </div>
              <div>
                <FieldLabel>Preview</FieldLabel>
                <div
                  className="h-28 rounded-xl border border-white/10 bg-slate-800/60 bg-cover bg-center"
                  style={form.thumbnail.trim() ? { backgroundImage: `url(${form.thumbnail.trim()})` } : undefined}
                >
                  {!form.thumbnail.trim() && (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">
                      Thumbnail preview
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Exercises */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Optional: add starter exercises here, or skip and assign exercises per day on the program
              detail page (Weekly Schedule tab) after you create.
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Picker */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <Input
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Search exercise or body part…"
                />
                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
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
                      {exercises.length === 0 ? 'No exercises in the library yet.' : 'No matches — try another search.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Selected */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Selected ({form.exercises.length})
                </p>
                {form.exercises.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-xs text-slate-500">
                    Click exercises on the left to add them.
                  </div>
                )}
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {form.exercises.map((row, index) => {
                    const meta = exerciseById.get(row.exerciseId)
                    return (
                      <div
                        key={`${row.exerciseId}-${index}`}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-medium text-white">
                            {index + 1}. {meta?.name ?? `Exercise #${row.exerciseId}`}
                          </p>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveExercise(index, -1)}
                              disabled={index === 0}
                              className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveExercise(index, 1)}
                              disabled={index === form.exercises.length - 1}
                              className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => removeExercise(index)}
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
                            onChange={(e) => updateExercise(index, 'sets', Number(e.target.value) || 0)}
                          />
                          <Input
                            label="Reps"
                            type="number"
                            min={1}
                            value={String(row.reps)}
                            onChange={(e) => updateExercise(index, 'reps', Number(e.target.value) || 0)}
                          />
                          <Input
                            label="Rest (s)"
                            type="number"
                            min={0}
                            value={String(row.restBetweenSets)}
                            onChange={(e) =>
                              updateExercise(index, 'restBetweenSets', Number(e.target.value) || 0)
                            }
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" onClick={() => goTo((step - 1) as Step)}>
                ← Back
              </Button>
            )}
            {step < 2 ? (
              <Button onClick={() => goTo((step + 1) as Step)}>Next →</Button>
            ) : (
              <Button onClick={handleSubmit} isLoading={isSaving}>
                {editing ? 'Save changes' : 'Create program'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
