import { useEffect, useMemo, useState } from 'react'
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
import { bodyPartsService } from '../../services/bodyParts.service'
import { exercisesService } from '../../services/exercises.service'
import type {
  CreateExerciseDto,
  CreateExerciseStepDto,
  Exercise,
  UpdateExerciseDto,
} from '../../types/exercise'
import type { BodyPart } from '../../types/bodyPart'

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

type ExerciseFormState = {
  name: string
  description: string
  steps: string
  videoUrl: string
  difficultyLevel: string
  equipmentRequired: string
  bodyPartId: number
  exerciseSteps: CreateExerciseStepDto[]
}

const defaultForm: ExerciseFormState = {
  name: '',
  description: '',
  steps: '',
  videoUrl: '',
  difficultyLevel: 'Beginner',
  equipmentRequired: '',
  bodyPartId: 0,
  exerciseSteps: [{ stepNumber: 1, description: '', imageUrl: '' }],
}

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

const difficultyTones: Record<string, string> = {
  Beginner: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  Intermediate: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  Advanced: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
}

function toFormState(exercise: Exercise): ExerciseFormState {
  return {
    name: exercise.name,
    description: exercise.description ?? '',
    steps: exercise.steps ?? '',
    videoUrl: exercise.videoUrl ?? '',
    difficultyLevel: exercise.difficultyLevel || 'Beginner',
    equipmentRequired: exercise.equipmentRequired ?? '',
    bodyPartId: exercise.bodyPartId,
    exerciseSteps:
      exercise.exerciseSteps.length > 0
        ? exercise.exerciseSteps.map((step) => ({
            stepNumber: step.stepNumber,
            description: step.description,
            imageUrl: step.imageUrl ?? '',
          }))
        : [{ stepNumber: 1, description: '', imageUrl: '' }],
  }
}

function sanitizeStep(step: CreateExerciseStepDto, index: number): CreateExerciseStepDto {
  return {
    stepNumber: index + 1,
    description: step.description.trim(),
    imageUrl: step.imageUrl?.trim() || null,
  }
}

function buildCreatePayload(form: ExerciseFormState): CreateExerciseDto {
  const filteredSteps = form.exerciseSteps
    .map(sanitizeStep)
    .filter((step) => step.description.length > 0)

  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    steps:
      form.steps.trim() ||
      filteredSteps.map((step) => `${step.stepNumber}. ${step.description}`).join('\n'),
    videoUrl: form.videoUrl.trim() || null,
    difficultyLevel: form.difficultyLevel,
    equipmentRequired: form.equipmentRequired.trim() || null,
    bodyPartId: form.bodyPartId,
    exerciseSteps: filteredSteps,
  }
}

function buildUpdatePayload(form: ExerciseFormState): UpdateExerciseDto {
  const payload = buildCreatePayload(form)
  return payload
}

export function ExercisesPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('All')
  const [bodyPartFilter, setBodyPartFilter] = useState<number | 'all'>('all')
  const [formError, setFormError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [form, setForm] = useState<ExerciseFormState>(defaultForm)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState<'created' | 'name' | 'difficulty' | 'bodyPart'>('created')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { data: pagedExercises, isLoading } = useQuery({
    queryKey: [
      'exercises-paged',
      page,
      pageSize,
      searchQuery,
      difficultyFilter,
      bodyPartFilter,
      sortBy,
      sortDir,
    ],
    queryFn: async () => {
      const { data } = await exercisesService.getPaged({
        page,
        pageSize,
        search: searchQuery,
        difficulty: difficultyFilter,
        bodyPartId: bodyPartFilter,
        sortBy,
        sortDir,
      })
      return data
    },
  })
  const exercises = pagedExercises?.items ?? []
  const totalCount = pagedExercises?.totalCount ?? 0

  const { data: bodyParts = [] } = useQuery({
    queryKey: ['body-parts'],
    queryFn: async () => {
      const { data } = await bodyPartsService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateExerciseDto) => exercisesService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] })
      void queryClient.invalidateQueries({ queryKey: ['exercises-paged'] })
      handleCloseModal()
    },
    onError: (error: Error) => setFormError(error.message || 'Failed to create exercise'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateExerciseDto }) =>
      exercisesService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] })
      void queryClient.invalidateQueries({ queryKey: ['exercises-paged'] })
      handleCloseModal()
    },
    onError: (error: Error) => setFormError(error.message || 'Failed to update exercise'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => exercisesService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] })
      void queryClient.invalidateQueries({ queryKey: ['exercises-paged'] })
    },
  })

  useEffect(() => {
    setPage(1)
  }, [searchQuery, difficultyFilter, bodyPartFilter, pageSize, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(page, totalPages)

  const stats = useMemo(() => {
    const beginner = exercises.filter((exercise) => exercise.difficultyLevel === 'Beginner').length
    const intermediate = exercises.filter(
      (exercise) => exercise.difficultyLevel === 'Intermediate',
    ).length
    const advanced = exercises.filter((exercise) => exercise.difficultyLevel === 'Advanced').length
    return {
      total: totalCount,
      bodyParts: new Set(exercises.map((exercise) => exercise.bodyPartId)).size,
      beginner,
      advanced,
      averageSteps:
        exercises.length > 0
          ? Math.round(
              exercises.reduce(
                (sum, exercise) =>
                  sum +
                  (exercise.exerciseSteps.length > 0
                    ? exercise.exerciseSteps.length
                    : exercise.steps
                      ? exercise.steps.split('\n').filter(Boolean).length
                      : 0),
                0,
              ) / exercises.length,
            )
          : 0,
      intermediate,
    }
  }, [exercises, totalCount])

  function handleOpenCreate() {
    setEditing(null)
    setForm(defaultForm)
    setFormError(null)
    setModalOpen(true)
  }

  function handleOpenEdit(exercise: Exercise) {
    setEditing(exercise)
    setForm(toFormState(exercise))
    setFormError(null)
    setModalOpen(true)
  }

  function handleCloseModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(defaultForm)
    setFormError(null)
  }

  function handleStepChange(index: number, field: keyof CreateExerciseStepDto, value: string) {
    setForm((current) => ({
      ...current,
      exerciseSteps: current.exerciseSteps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step,
      ),
    }))
  }

  function handleAddStep() {
    setForm((current) => ({
      ...current,
      exerciseSteps: [
        ...current.exerciseSteps,
        {
          stepNumber: current.exerciseSteps.length + 1,
          description: '',
          imageUrl: '',
        },
      ],
    }))
  }

  function handleRemoveStep(index: number) {
    setForm((current) => ({
      ...current,
      exerciseSteps: current.exerciseSteps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, stepNumber: i + 1 })),
    }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (!form.name.trim()) {
      setFormError('Exercise name is required.')
      return
    }
    if (form.bodyPartId <= 0) {
      setFormError('Please select a body part.')
      return
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: buildUpdatePayload(form) })
      return
    }
    createMutation.mutate(buildCreatePayload(form))
  }

  function handleDelete(exercise: Exercise) {
    if (!window.confirm(`Delete exercise "${exercise.name}"?`)) return
    deleteMutation.mutate(exercise.id)
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Training"
        titleGradient="exercises"
        subtitle="Manage the exercise library, body-part mapping, difficulty tiers, and step-by-step coaching."
        showExport={false}
        primaryAction={{ label: '+ Add exercise', onClick: handleOpenCreate }}
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Exercises"
            value={stats.total}
            gradient="from-blue-500 to-indigo-500"
            icon={<span className="text-lg">E</span>}
            caption="Library size"
          />
          <MetricCard
            title="Body Parts"
            value={stats.bodyParts}
            gradient="from-cyan-500 to-sky-500"
            icon={<span className="text-lg">B</span>}
            caption="Covered muscle groups"
          />
          <MetricCard
            title="Beginner"
            value={stats.beginner}
            gradient="from-emerald-500 to-teal-500"
            icon={<span className="text-lg">B</span>}
            caption="Entry-level movements"
          />
          <MetricCard
            title="Avg. Steps"
            value={stats.averageSteps}
            gradient="from-purple-500 to-fuchsia-500"
            icon={<span className="text-lg">S</span>}
            caption="Instruction depth"
          />
        </div>

        <DashboardTablePanel
          title="Exercise Library"
          description="Use filters to narrow by body part or difficulty, then edit instructions and media metadata."
          toolbar={
            <>
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search exercise, body part, equipment..."
                className="min-w-[230px] !py-2"
              />
              <select
                value={difficultyFilter}
                onChange={(event) => setDifficultyFilter(event.target.value)}
                className={`${selectClass} min-w-[150px] py-2`}
                aria-label="Filter exercises by difficulty"
              >
                <option value="All" className="bg-slate-900">
                  All levels
                </option>
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
              <select
                value={bodyPartFilter}
                onChange={(event) =>
                  setBodyPartFilter(
                    event.target.value === 'all' ? 'all' : Number(event.target.value),
                  )
                }
                className={`${selectClass} min-w-[180px] py-2`}
                aria-label="Filter exercises by body part"
              >
                <option value="all" className="bg-slate-900">
                  All body parts
                </option>
                {bodyParts.map((bodyPart) => (
                  <option key={bodyPart.id} value={bodyPart.id} className="bg-slate-900">
                    {bodyPart.name}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value as 'created' | 'name' | 'difficulty' | 'bodyPart',
                  )
                }
                className={`${selectClass} min-w-[150px] py-2`}
                aria-label="Sort exercises by field"
              >
                <option value="created" className="bg-slate-900">
                  Sort: Latest
                </option>
                <option value="name" className="bg-slate-900">
                  Sort: Name
                </option>
                <option value="difficulty" className="bg-slate-900">
                  Sort: Difficulty
                </option>
                <option value="bodyPart" className="bg-slate-900">
                  Sort: Body Part
                </option>
              </select>
              <select
                value={sortDir}
                onChange={(event) => setSortDir(event.target.value as 'asc' | 'desc')}
                className={`${selectClass} min-w-[130px] py-2`}
                aria-label="Sort direction for exercises"
              >
                <option value="desc" className="bg-slate-900">
                  Desc
                </option>
                <option value="asc" className="bg-slate-900">
                  Asc
                </option>
              </select>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className={`${selectClass} min-w-[130px] py-2`}
                aria-label="Exercises rows per page"
              >
                <option value={10} className="bg-slate-900">
                  10 / page
                </option>
                <option value={20} className="bg-slate-900">
                  20 / page
                </option>
                <option value={50} className="bg-slate-900">
                  50 / page
                </option>
              </select>
            </>
          }
        >
          {isLoading ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading exercises...</p>
          ) : exercises.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">
              No exercises match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3">Exercise</th>
                    <th className="px-6 py-3">Body Part</th>
                    <th className="px-6 py-3">Difficulty</th>
                    <th className="px-6 py-3">Equipment</th>
                    <th className="px-6 py-3">Steps</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.map((exercise) => (
                    <tr
                      key={exercise.id}
                      className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-white">{exercise.name}</p>
                        <p className="mt-1 max-w-md text-xs text-slate-400">
                          {exercise.description?.trim() || 'No description yet.'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{exercise.bodyPartName}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            difficultyTones[exercise.difficultyLevel] ??
                            'bg-white/5 text-slate-300 ring-1 ring-white/10'
                          }`}
                        >
                          {exercise.difficultyLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {exercise.equipmentRequired?.trim() || 'Bodyweight'}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {exercise.exerciseSteps.length || exercise.steps.split('\n').filter(Boolean).length}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="soft" size="sm" onClick={() => handleOpenEdit(exercise)}>
                            Edit
                          </Button>
                          <Button
                            variant="soft"
                            size="sm"
                            className="!bg-rose-500/10 !text-rose-300 hover:!bg-rose-500/20"
                            onClick={() => handleDelete(exercise)}
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
          {totalCount > 0 && (
            <div className="flex items-center justify-between border-t border-white/5 px-6 py-3">
              <p className="text-xs text-slate-400">
                Showing {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="soft"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Prev
                </Button>
                <span className="text-xs text-slate-400">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="soft"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editing ? 'Edit exercise' : 'Add exercise'}
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
              label="Exercise name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Body part
              </label>
              <select
                value={form.bodyPartId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bodyPartId: Number(event.target.value) }))
                }
                className={selectClass}
                aria-label="Exercise body part"
                required
              >
                <option value={0} className="bg-slate-900">
                  Select body part
                </option>
                {bodyParts.map((bodyPart: BodyPart) => (
                  <option key={bodyPart.id} value={bodyPart.id} className="bg-slate-900">
                    {bodyPart.name}
                  </option>
                ))}
              </select>
            </div>
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
                aria-label="Exercise difficulty level"
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
            <Input
              label="Equipment"
              value={form.equipmentRequired}
              onChange={(event) =>
                setForm((current) => ({ ...current, equipmentRequired: event.target.value }))
              }
              placeholder="Dumbbells, cable machine, kettlebell..."
            />
            <Input
              label="Video URL"
              value={form.videoUrl}
              onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
              placeholder="https://..."
              className="sm:col-span-2"
            />
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
              placeholder="What is this movement used for?"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                Coaching steps
              </label>
              <Button variant="ghost" size="sm" onClick={handleAddStep}>
                + Add step
              </Button>
            </div>
            <div className="space-y-3">
              {form.exerciseSteps.map((step, index) => (
                <div
                  key={`${step.stepNumber}-${index}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Step {index + 1}</p>
                    {form.exerciseSteps.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveStep(index)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
                    <textarea
                      value={step.description}
                      onChange={(event) =>
                        handleStepChange(index, 'description', event.target.value)
                      }
                      rows={2}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                      placeholder="Cue, movement, or safety note..."
                    />
                    <Input
                      label="Step image URL"
                      value={step.imageUrl ?? ''}
                      onChange={(event) => handleStepChange(index, 'imageUrl', event.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Legacy steps text
            </label>
            <textarea
              value={form.steps}
              onChange={(event) => setForm((current) => ({ ...current, steps: event.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              placeholder="Optional fallback text for older consumers..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Update exercise' : 'Create exercise'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
