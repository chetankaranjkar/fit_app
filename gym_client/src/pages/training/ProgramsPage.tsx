import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import {
  DashboardSubpageShell,
  DashboardTablePanel,
} from '../../components/layout/DashboardSubpageShell'
import { DashboardMetricsGrid } from '../../components/layout/DashboardMetricsGrid'
import { MetricCard } from '../../components/dashboard/MetricCard'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { exercisesService } from '../../services/exercises.service'
import { trainersService } from '../../services/trainers.service'
import { programsService } from '../../services/workoutPlans.service'
import type { Exercise } from '../../types/exercise'
import type { Trainer } from '../../types/trainer'
import type {
  CreateWorkoutPlanDto,
  CreateWorkoutPlanExerciseDto,
  ProgramGoal,
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

const PROGRAM_GOALS: ProgramGoal[] = [
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

type FormState = {
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
  exercises: CreateWorkoutPlanExerciseDto[]
}

const defaultForm: FormState = {
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
  exercises: [{ exerciseId: 0, sets: 3, reps: 12, restBetweenSets: 60, order: 1, weight: null }],
}

const workoutTypes: WorkoutType[] = ['Warmup', 'ShortHIIT', 'LongHIIT', 'Strength', 'Cardio']
const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

function buildPayload(form: FormState): CreateWorkoutPlanDto {
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
    exercises: form.exercises
      .filter((exercise) => exercise.exerciseId > 0)
      .map((exercise, index) => ({ ...exercise, order: index + 1 })),
  }
}

export function ProgramsPage() {
  const { userName } = getDashboardUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [goalFilter, setGoalFilter] = useState<string | 'All'>('All')
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WorkoutPlan | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data } = await programsService.getAll()
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
    mutationFn: (payload: CreateWorkoutPlanDto) => programsService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['programs'] })
      handleCloseModal()
    },
    onError: (error: Error) => setFormError(error.message || 'Failed to create program'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreateWorkoutPlanDto }) =>
      programsService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['programs'] })
      handleCloseModal()
    },
    onError: (error: Error) => setFormError(error.message || 'Failed to update program'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => programsService.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['programs'] }),
  })

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return programs.filter((plan) => {
      const matchesQuery =
        q.length === 0 ||
        plan.name.toLowerCase().includes(q) ||
        (plan.description ?? '').toLowerCase().includes(q) ||
        (plan.trainerName ?? '').toLowerCase().includes(q) ||
        (plan.goal ?? '').toLowerCase().includes(q)

      const matchesGoal = goalFilter === 'All' || (plan.goal ?? '') === goalFilter

      const matchesVisibility =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'public' && plan.isPublic) ||
        (visibilityFilter === 'private' && !plan.isPublic)

      return matchesQuery && matchesGoal && matchesVisibility
    })
  }, [searchQuery, goalFilter, visibilityFilter, programs])

  const stats = useMemo(() => {
    const active = programs.filter((p) => p.isActive && (p.status ?? 'Active') === 'Active').length
    const assigned = programs.reduce((s, p) => s + (p.assignedMembersCount ?? 0), 0)
    const withRate = programs.filter((p) => (p.completionRatePercent ?? 0) > 0)
    const avgCompletion =
      withRate.length > 0
        ? Math.round(withRate.reduce((s, p) => s + (p.completionRatePercent ?? 0), 0) / withRate.length)
        : 0
    return {
      total: programs.length,
      active,
      assigned,
      avgCompletion,
    }
  }, [programs])

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
                tempo: exercise.tempo ?? null,
                intensity: exercise.intensity ?? null,
                notes: exercise.notes ?? null,
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

  function updateExerciseRow(index: number, field: keyof CreateWorkoutPlanExerciseDto, value: number | null) {
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
      setFormError('Program name is required.')
      return
    }
    if (form.exercises.every((exercise) => exercise.exerciseId <= 0)) {
      setFormError('Add at least one exercise, or open Program Details to build week/day structure after create.')
      return
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: buildPayload(form) })
      return
    }
    createMutation.mutate(buildPayload(form))
  }

  function handleDelete(plan: WorkoutPlan) {
    if (!window.confirm(`Delete program "${plan.name}"?`)) return
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
        titleGradient="programs"
        subtitle="Program management · week-based templates, assignments, and progression-ready structure."
        showExport={false}
        primaryAction={{ label: '+ New program', onClick: handleOpenCreate }}
      >
        <DashboardMetricsGrid cols={4}>
          <MetricCard
            title="Total programs"
            value={stats.total}
            gradient="from-violet-500 to-fuchsia-500"
            icon={<span className="text-lg">P</span>}
            caption="Templates in library"
          />
          <MetricCard
            title="Active programs"
            value={stats.active}
            gradient="from-emerald-500 to-teal-500"
            icon={<span className="text-lg">A</span>}
            caption="Status active + enabled"
          />
          <MetricCard
            title="Assigned members"
            value={stats.assigned}
            gradient="from-sky-500 to-cyan-500"
            icon={<span className="text-lg">M</span>}
            caption="Seat count across schedules"
          />
          <MetricCard
            title="Avg completion"
            value={`${stats.avgCompletion}%`}
            gradient="from-amber-500 to-orange-500"
            icon={<span className="text-lg">C</span>}
            caption="From logged sessions"
          />
        </DashboardMetricsGrid>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filtered.slice(0, 4).map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => navigate(`/dashboard/training/programs/${plan.id}`)}
              className="glass-card group flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div
                className="size-24 shrink-0 overflow-hidden rounded-xl bg-slate-800 bg-cover bg-center ring-1 ring-white/10"
                style={plan.thumbnail ? { backgroundImage: `url(${plan.thumbnail})` } : undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white group-hover:text-cyan-200">{plan.name}</p>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{plan.goal ?? plan.workoutType}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  <span>{plan.durationDays ?? '—'}d</span>
                  <span>{plan.difficultyLevel}</span>
                  <span>{plan.workoutsPerWeek ?? '—'}×/wk</span>
                  <span>{plan.completionRatePercent ?? 0}% done</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <DashboardTablePanel
          title="Program Library"
          description="Thumbnail-rich catalog · open a program for the full builder, analytics, and assignment flows."
          toolbar={
            <>
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search program, trainer, goal…"
                className="min-w-[230px] !py-2"
              />
              <select
                value={goalFilter}
                onChange={(event) => setGoalFilter(event.target.value as string | 'All')}
                className={`${selectClass} min-w-[180px] py-2`}
                aria-label="Filter by goal"
              >
                <option value="All" className="bg-slate-900">
                  All goals
                </option>
                {PROGRAM_GOALS.map((g) => (
                  <option key={g} value={g} className="bg-slate-900">
                    {g}
                  </option>
                ))}
              </select>
              <select
                value={visibilityFilter}
                onChange={(event) =>
                  setVisibilityFilter(event.target.value as 'all' | 'public' | 'private')
                }
                className={`${selectClass} min-w-[150px] py-2`}
                aria-label="Visibility"
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
            <p className="px-6 py-8 text-sm text-slate-400">Loading programs…</p>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">No programs match the filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3">Program</th>
                    <th className="px-6 py-3">Goal</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Freq</th>
                    <th className="px-6 py-3">Trainer</th>
                    <th className="px-6 py-3">Members</th>
                    <th className="px-6 py-3">Completion</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((plan) => (
                    <tr
                      key={plan.id}
                      className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="flex gap-3">
                          <div
                            className="size-12 shrink-0 rounded-lg bg-slate-800 bg-cover bg-center"
                            style={plan.thumbnail ? { backgroundImage: `url(${plan.thumbnail})` } : undefined}
                          />
                          <div>
                            <Link
                              to={`/dashboard/training/programs/${plan.id}`}
                              className="font-medium text-white hover:text-cyan-200"
                            >
                              {plan.name}
                            </Link>
                            <p className="mt-1 max-w-md text-xs text-slate-400 line-clamp-2">
                              {plan.description?.trim() || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{plan.goal ?? plan.workoutType}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {plan.durationDays ?? '—'} days · {plan.difficultyLevel}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{plan.workoutsPerWeek ?? '—'} / week</td>
                      <td className="px-6 py-4 text-slate-300">{plan.trainerName?.trim() || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-slate-300">{plan.assignedMembersCount ?? 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all"
                              style={{ width: `${Math.min(100, plan.completionRatePercent ?? 0)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{plan.completionRatePercent ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="soft" size="sm" onClick={() => navigate(`/dashboard/training/programs/${plan.id}`)}>
                            Open
                          </Button>
                          <Button variant="soft" size="sm" onClick={() => handleOpenEdit(plan)}>
                            Quick edit
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
        title={editing ? 'Quick edit program' : 'Create program'}
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
              label="Program name"
              value={form.name}
              onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
              required
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Goal
              </label>
              <select
                value={form.goal}
                onChange={(event) => setForm((c) => ({ ...c, goal: event.target.value }))}
                className={selectClass}
              >
                {PROGRAM_GOALS.map((g) => (
                  <option key={g} value={g} className="bg-slate-900">
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Workout type
              </label>
              <select
                value={form.workoutType}
                onChange={(event) =>
                  setForm((c) => ({ ...c, workoutType: event.target.value as WorkoutType }))
                }
                className={selectClass}
              >
                {workoutTypes.map((type) => (
                  <option key={type} value={type} className="bg-slate-900">
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Program length (days)
              </label>
              <select
                value={form.durationDays}
                onChange={(event) => setForm((c) => ({ ...c, durationDays: Number(event.target.value) }))}
                className={selectClass}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    {d} days
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Workouts / week
              </label>
              <select
                value={form.workoutsPerWeek}
                onChange={(event) => setForm((c) => ({ ...c, workoutsPerWeek: Number(event.target.value) }))}
                className={selectClass}
              >
                {FREQ_OPTIONS.map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    {d} days
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Avg session (minutes)"
              type="number"
              min={5}
              value={String(form.duration)}
              onChange={(event) => setForm((c) => ({ ...c, duration: Number(event.target.value) || 0 }))}
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Difficulty
              </label>
              <select
                value={form.difficultyLevel}
                onChange={(event) => setForm((c) => ({ ...c, difficultyLevel: event.target.value }))}
                className={selectClass}
              >
                {['Beginner', 'Intermediate', 'Advanced'].map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Thumbnail URL"
              value={form.thumbnail}
              onChange={(event) => setForm((c) => ({ ...c, thumbnail: event.target.value }))}
              placeholder="https://..."
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Status
              </label>
              <select
                value={form.status}
                onChange={(event) => setForm((c) => ({ ...c, status: event.target.value }))}
                className={selectClass}
              >
                {['Draft', 'Active', 'Archived'].map((s) => (
                  <option key={s} value={s} className="bg-slate-900">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Trainer
              </label>
              <select
                value={form.trainerId}
                onChange={(event) => setForm((c) => ({ ...c, trainerId: Number(event.target.value) }))}
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
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(event) => setForm((c) => ({ ...c, isPublic: event.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              <span className="text-sm text-slate-200">Visible to members (public catalog)</span>
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Tags (comma separated)
            </label>
            <Input value={form.tags} onChange={(event) => setForm((c) => ({ ...c, tags: event.target.value }))} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                Baseline exercises (flat list)
              </label>
              <Button variant="ghost" size="sm" onClick={addExerciseRow} disabled={form.exercises.length >= maxExercisesPerPlan}>
                + Add exercise
              </Button>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              For week/day scheduling and drag-drop, open the program after save. This list seeds legacy flat assignments.
            </p>
            <div className="space-y-3">
              {form.exercises.map((row, index) => (
                <div key={`${index}-${row.order}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
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
                        onChange={(event) => updateExerciseRow(index, 'exerciseId', Number(event.target.value))}
                        className={selectClass}
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
                      onChange={(event) => updateExerciseRow(index, 'sets', Number(event.target.value) || 0)}
                    />
                    <Input
                      label="Reps"
                      type="number"
                      min={1}
                      value={String(row.reps)}
                      onChange={(event) => updateExerciseRow(index, 'reps', Number(event.target.value) || 0)}
                    />
                    <Input
                      label="Rest (sec)"
                      type="number"
                      min={0}
                      value={String(row.restBetweenSets)}
                      onChange={(event) => updateExerciseRow(index, 'restBetweenSets', Number(event.target.value) || 0)}
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
              {editing ? 'Update program' : 'Create program'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
