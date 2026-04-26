import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import {
  DashboardSubpageShell,
  DashboardTablePanel,
} from '../../components/layout/DashboardSubpageShell'
import { MetricCard } from '../../components/dashboard/MetricCard'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { exercisesService } from '../../services/exercises.service'
import { trainersService } from '../../services/trainers.service'
import { workoutPlansService } from '../../services/workoutPlans.service'
import type { Exercise } from '../../types/exercise'
import type { Trainer } from '../../types/trainer'
import type {
  CreateWorkoutPlanDto,
  CreateWorkoutPlanExerciseDto,
  WorkoutPlan,
  WorkoutType,
} from '../../types/workoutPlan'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

type WorkoutPlanFormState = {
  name: string
  description: string
  workoutType: WorkoutType
  duration: number
  difficultyLevel: string
  trainerId: number
  isPublic: boolean
  exercises: CreateWorkoutPlanExerciseDto[]
}

const defaultForm: WorkoutPlanFormState = {
  name: '',
  description: '',
  workoutType: 'Strength',
  duration: 45,
  difficultyLevel: 'Beginner',
  trainerId: 0,
  isPublic: false,
  exercises: [{ exerciseId: 0, sets: 3, reps: 12, restBetweenSets: 60, order: 1, weight: null }],
}

const workoutTypes: WorkoutType[] = ['Warmup', 'ShortHIIT', 'LongHIIT', 'Strength', 'Cardio']
const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

function buildPayload(form: WorkoutPlanFormState): CreateWorkoutPlanDto {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    workoutType: form.workoutType,
    duration: form.duration,
    difficultyLevel: form.difficultyLevel,
    trainerId: form.trainerId > 0 ? form.trainerId : null,
    isPublic: form.isPublic,
    exercises: form.exercises
      .filter((exercise) => exercise.exerciseId > 0)
      .map((exercise, index) => ({
        ...exercise,
        order: index + 1,
      })),
  }
}

export function WorkoutPlansPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'All' | WorkoutType>('All')
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WorkoutPlan | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<WorkoutPlanFormState>(defaultForm)

  const { data: workoutPlans = [], isLoading } = useQuery({
    queryKey: ['workout-plans'],
    queryFn: async () => {
      const { data } = await workoutPlansService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data } = await exercisesService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data } = await trainersService.getAll()
      return Array.isArray(data) ? (data as Trainer[]) : []
    },
  })
  const maxExercisesPerPlan = Math.max(1, exercises.length || 1)

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkoutPlanDto) => workoutPlansService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workout-plans'] })
      handleCloseModal()
    },
    onError: (error: Error) => setFormError(error.message || 'Failed to create workout plan'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreateWorkoutPlanDto }) =>
      workoutPlansService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workout-plans'] })
      handleCloseModal()
    },
    onError: (error: Error) => setFormError(error.message || 'Failed to update workout plan'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workoutPlansService.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workout-plans'] }),
  })

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return workoutPlans.filter((plan) => {
      const matchesQuery =
        q.length === 0 ||
        plan.name.toLowerCase().includes(q) ||
        (plan.description ?? '').toLowerCase().includes(q) ||
        (plan.trainerName ?? '').toLowerCase().includes(q)

      const matchesType = typeFilter === 'All' || plan.workoutType === typeFilter

      const matchesVisibility =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'public' && plan.isPublic) ||
        (visibilityFilter === 'private' && !plan.isPublic)

      return matchesQuery && matchesType && matchesVisibility
    })
  }, [searchQuery, typeFilter, visibilityFilter, workoutPlans])

  const stats = useMemo(() => {
    const publicPlans = workoutPlans.filter((plan) => plan.isPublic).length
    const activePlans = workoutPlans.filter((plan) => plan.isActive).length
    const totalExercises = workoutPlans.reduce((sum, plan) => sum + plan.exercises.length, 0)
    return {
      total: workoutPlans.length,
      publicPlans,
      activePlans,
      avgExercises:
        workoutPlans.length > 0 ? Math.round(totalExercises / workoutPlans.length) : 0,
    }
  }, [workoutPlans])

  function handleOpenCreate() {
    setEditing(null)
    setForm(defaultForm)
    setFormError(null)
    setModalOpen(true)
  }

  function handleOpenEdit(plan: WorkoutPlan) {
    setEditing(plan)
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      workoutType: plan.workoutType,
      duration: plan.duration,
      difficultyLevel: plan.difficultyLevel,
      trainerId: plan.trainerId ?? 0,
      isPublic: plan.isPublic,
      exercises:
        plan.exercises.length > 0
          ? plan.exercises
              .sort((a, b) => a.order - b.order)
              .map((exercise) => ({
                exerciseId: exercise.exerciseId,
                sets: exercise.sets,
                reps: exercise.reps,
                restBetweenSets: exercise.restBetweenSets,
                order: exercise.order,
                weight: exercise.weight ?? null,
              }))
          : defaultForm.exercises,
    })
    setFormError(null)
    setModalOpen(true)
  }

  function handleCloseModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(defaultForm)
    setFormError(null)
  }

  function updateExerciseRow(
    index: number,
    field: keyof CreateWorkoutPlanExerciseDto,
    value: number | null,
  ) {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, i) =>
        i === index ? { ...exercise, [field]: value } : exercise,
      ),
    }))
  }

  function addExerciseRow() {
    setFormError(null)
    setForm((current) => ({
      ...current,
      exercises:
        current.exercises.length >= maxExercisesPerPlan
          ? current.exercises
          : [
              ...current.exercises,
              {
                exerciseId: 0,
                sets: 3,
                reps: 10,
                restBetweenSets: 60,
                order: current.exercises.length + 1,
                weight: null,
              },
            ],
    }))
  }

  function setExerciseRowCount(targetCount: number) {
    if (!Number.isFinite(targetCount)) return
    const safeTarget = Math.max(1, Math.min(maxExercisesPerPlan, Math.floor(targetCount)))
    setForm((current) => {
      if (safeTarget === current.exercises.length) return current
      if (safeTarget < current.exercises.length) {
        return {
          ...current,
          exercises: current.exercises
            .slice(0, safeTarget)
            .map((exercise, index) => ({ ...exercise, order: index + 1 })),
        }
      }
      const toAdd = safeTarget - current.exercises.length
      const appended = Array.from({ length: toAdd }, (_, i) => ({
        exerciseId: 0,
        sets: 3,
        reps: 10,
        restBetweenSets: 60,
        order: current.exercises.length + i + 1,
        weight: null,
      }))
      return {
        ...current,
        exercises: [...current.exercises, ...appended],
      }
    })
    setFormError(null)
  }

  function removeExerciseRow(index: number) {
    setFormError(null)
    setForm((current) => ({
      ...current,
      exercises: current.exercises
        .filter((_, i) => i !== index)
        .map((exercise, i) => ({ ...exercise, order: i + 1 })),
    }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (!form.name.trim()) {
      setFormError('Plan name is required.')
      return
    }
    if (form.exercises.every((exercise) => exercise.exerciseId <= 0)) {
      setFormError('Add at least one exercise to the workout plan.')
      return
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: buildPayload(form) })
      return
    }
    createMutation.mutate(buildPayload(form))
  }

  function handleDelete(plan: WorkoutPlan) {
    if (!window.confirm(`Delete workout plan "${plan.name}"?`)) return
    deleteMutation.mutate(plan.id)
  }

  function trainerLabel(trainer: Trainer) {
    const name = `${trainer.firstName ?? ''} ${trainer.lastName ?? ''}`.trim()
    return name || `Trainer #${trainer.id}`
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Training"
        titleGradient="workout plans"
        subtitle="Build structured programs from the exercise library and assign ownership to trainers."
        showExport={false}
        primaryAction={{ label: '+ New plan', onClick: handleOpenCreate }}
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Plans"
            value={stats.total}
            gradient="from-violet-500 to-fuchsia-500"
            icon={<span className="text-lg">P</span>}
            caption="Total workout templates"
          />
          <MetricCard
            title="Active"
            value={stats.activePlans}
            gradient="from-emerald-500 to-teal-500"
            icon={<span className="text-lg">A</span>}
            caption="Currently enabled"
          />
          <MetricCard
            title="Public"
            value={stats.publicPlans}
            gradient="from-sky-500 to-cyan-500"
            icon={<span className="text-lg">V</span>}
            caption="Shared with members"
          />
          <MetricCard
            title="Avg. Exercises"
            value={stats.avgExercises}
            gradient="from-amber-500 to-orange-500"
            icon={<span className="text-lg">E</span>}
            caption="Per plan"
          />
        </div>

        <DashboardTablePanel
          title="Workout Plan Library"
          description="Create reusable plan templates and keep exercise ordering, volume, and trainer ownership consistent."
          toolbar={
            <>
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search plan, trainer, description..."
                className="min-w-[230px] !py-2"
              />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'All' | WorkoutType)}
                className={`${selectClass} min-w-[150px] py-2`}
                aria-label="Filter workout plans by type"
              >
                <option value="All" className="bg-slate-900">
                  All types
                </option>
                {workoutTypes.map((type) => (
                  <option key={type} value={type} className="bg-slate-900">
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={visibilityFilter}
                onChange={(event) =>
                  setVisibilityFilter(event.target.value as 'all' | 'public' | 'private')
                }
                className={`${selectClass} min-w-[150px] py-2`}
                aria-label="Filter workout plans by visibility"
              >
                <option value="all" className="bg-slate-900">
                  All visibility
                </option>
                <option value="public" className="bg-slate-900">
                  Public
                </option>
                <option value="private" className="bg-slate-900">
                  Private
                </option>
              </select>
            </>
          }
        >
          {isLoading ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading workout plans...</p>
          ) : filteredPlans.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">No workout plans match the filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3">Plan</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Trainer</th>
                    <th className="px-6 py-3">Exercises</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Visibility</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((plan) => (
                    <tr
                      key={plan.id}
                      className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-white">{plan.name}</p>
                        <p className="mt-1 max-w-md text-xs text-slate-400">
                          {plan.description?.trim() || 'No description yet.'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{plan.workoutType}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {plan.trainerName?.trim() || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{plan.exercises.length}</td>
                      <td className="px-6 py-4 text-slate-300">{plan.duration} min</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            plan.isPublic
                              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                              : 'bg-white/5 text-slate-300 ring-1 ring-white/10'
                          }`}
                        >
                          {plan.isPublic ? 'Public' : 'Private'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="soft" size="sm" onClick={() => handleOpenEdit(plan)}>
                            Edit
                          </Button>
                          <Button
                            variant="soft"
                            size="sm"
                            className="!bg-rose-500/10 !text-rose-300 hover:!bg-rose-500/20"
                            onClick={() => handleDelete(plan)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editing ? 'Edit workout plan' : 'Create workout plan'}
        size="wide"
        scrollable
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Plan name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Workout type
              </label>
              <select
                value={form.workoutType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    workoutType: event.target.value as WorkoutType,
                  }))
                }
                className={selectClass}
                aria-label="Workout type"
              >
                {workoutTypes.map((type) => (
                  <option key={type} value={type} className="bg-slate-900">
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Duration (minutes)"
              type="number"
              min={5}
              value={String(form.duration)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  duration: Number(event.target.value) || 0,
                }))
              }
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Difficulty
              </label>
              <select
                value={form.difficultyLevel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, difficultyLevel: event.target.value }))
                }
                className={selectClass}
                aria-label="Workout plan difficulty"
              >
                <option value="Beginner" className="bg-slate-900">
                  Beginner
                </option>
                <option value="Intermediate" className="bg-slate-900">
                  Intermediate
                </option>
                <option value="Advanced" className="bg-slate-900">
                  Advanced
                </option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Trainer
              </label>
              <select
                value={form.trainerId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, trainerId: Number(event.target.value) }))
                }
                className={selectClass}
                aria-label="Workout plan trainer"
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
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isPublic: event.target.checked }))
                }
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              <span className="text-sm text-slate-200">Visible to members</span>
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              placeholder="What result or training goal does this plan support?"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                Plan exercises
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Max</span>
                  <input
                    type="number"
                    min={1}
                    max={maxExercisesPerPlan}
                    value={form.exercises.length}
                    onChange={(event) => setExerciseRowCount(Number(event.target.value))}
                    className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-slate-100 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    aria-label="Maximum exercises for this plan"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addExerciseRow}
                  disabled={form.exercises.length >= maxExercisesPerPlan}
                >
                  + Add exercise
                </Button>
              </div>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              You can add up to {maxExercisesPerPlan} exercises (based on your current exercise library) and remove any row you do not need.
            </p>
            <div className="space-y-3">
              {form.exercises.map((row, index) => (
                <div
                  key={`${index}-${row.order}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Exercise {index + 1}</p>
                    {form.exercises.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeExerciseRow(index)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                        Exercise
                      </label>
                      <select
                        value={row.exerciseId}
                        onChange={(event) =>
                          updateExerciseRow(index, 'exerciseId', Number(event.target.value))
                        }
                        className={selectClass}
                        aria-label={`Exercise selection row ${index + 1}`}
                      >
                        <option value={0} className="bg-slate-900">
                          Select exercise
                        </option>
                        {exercises.map((exercise: Exercise) => (
                          <option key={exercise.id} value={exercise.id} className="bg-slate-900">
                            {exercise.name} ({exercise.bodyPartName})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Sets"
                      type="number"
                      min={1}
                      value={String(row.sets)}
                      onChange={(event) =>
                        updateExerciseRow(index, 'sets', Number(event.target.value) || 0)
                      }
                    />
                    <Input
                      label="Reps"
                      type="number"
                      min={1}
                      value={String(row.reps)}
                      onChange={(event) =>
                        updateExerciseRow(index, 'reps', Number(event.target.value) || 0)
                      }
                    />
                    <Input
                      label="Rest (sec)"
                      type="number"
                      min={0}
                      value={String(row.restBetweenSets)}
                      onChange={(event) =>
                        updateExerciseRow(
                          index,
                          'restBetweenSets',
                          Number(event.target.value) || 0,
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Update plan' : 'Create plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
