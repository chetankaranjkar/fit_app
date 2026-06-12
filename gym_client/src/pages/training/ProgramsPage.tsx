import { useEffect, useMemo, useState } from 'react'
import { ListPagination } from '../../components/ui/ListPagination'
import { useClientPagination } from '../../hooks/useClientPagination'
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
import { ConfirmDialog, useConfirm } from '../../components/ui/ConfirmDialog'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  PROGRAM_GOALS,
  ProgramWizard,
  defaultProgramForm,
  planToProgramForm,
  programFormToPayload,
  type ProgramFormState,
} from './program/ProgramWizard'
import { exercisesService } from '../../services/exercises.service'
import { trainersService } from '../../services/trainers.service'
import { programsService } from '../../services/workoutPlans.service'
import { workoutCategoriesService } from '../../services/workoutCategories.service'
import type { Trainer } from '../../types/trainer'
import type { CreateWorkoutPlanDto, WorkoutPlan } from '../../types/workoutPlan'

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

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

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
  const [pageError, setPageError] = useState<string | null>(null)
  const deleteConfirm = useConfirm<WorkoutPlan>()
  const [wizardInitialForm, setWizardInitialForm] = useState<ProgramFormState>(defaultProgramForm)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data } = await programsService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises-picker'],
    queryFn: async () => {
      const { data } = await exercisesService.getPaged({ page: 1, pageSize: 150 })
      return data.items ?? []
    },
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['workout-categories'],
    queryFn: async () => {
      const { data } = await workoutCategoriesService.getAll()
      return Array.isArray(data) ? data.filter((c) => c.isActive !== false) : []
    },
  })

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data } = await trainersService.getAll()
      return Array.isArray(data) ? (data as Trainer[]) : []
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkoutPlanDto) => programsService.create(payload).then((r) => r.data),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['programs'] })
      handleCloseModal()
      navigate(`/dashboard/training/programs/${created.id}`)
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
    onSuccess: () => {
      setPageError(null)
      deleteConfirm.close()
      void queryClient.invalidateQueries({ queryKey: ['programs'] })
    },
    onError: (error: Error) => {
      deleteConfirm.close()
      setPageError(error.message || 'Failed to delete program. It may be assigned to members.')
    },
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

  useEffect(() => {
    setPage(1)
  }, [searchQuery, goalFilter, visibilityFilter])

  const { pageItems: pagedPrograms, totalCount: filteredTotal } = useClientPagination(
    filtered,
    page,
    pageSize,
  )

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
    setWizardInitialForm(defaultProgramForm)
    setFormError(null)
    setModalOpen(true)
  }

  function handleOpenEdit(plan: WorkoutPlan) {
    setEditing(plan)
    setWizardInitialForm(planToProgramForm(plan))
    setFormError(null)
    setModalOpen(true)
  }

  function handleCloseModal() {
    setModalOpen(false)
    setEditing(null)
    setWizardInitialForm(defaultProgramForm)
    setFormError(null)
  }

  function handleWizardSubmit(form: ProgramFormState) {
    setFormError(null)
    const payload: CreateWorkoutPlanDto = programFormToPayload(form)
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload })
      return
    }
    createMutation.mutate(payload)
  }

  function handleDelete(plan: WorkoutPlan) {
    deleteConfirm.request(plan)
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
        {pageError && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => setPageError(null)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/15"
            >
              Dismiss
            </button>
          </div>
        )}
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
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <Skeleton className="size-24 shrink-0" variant="rectangular" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-1/2" variant="text" />
                  <Skeleton className="h-3 w-3/4" variant="text" />
                  <Skeleton className="h-3 w-2/3" variant="text" />
                </div>
              </div>
            ))}
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
            <div className="space-y-3 px-6 py-6" aria-busy="true" aria-label="Loading programs">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-12 shrink-0" variant="rectangular" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" variant="text" />
                    <Skeleton className="h-3 w-2/3" variant="text" />
                  </div>
                  <Skeleton className="h-8 w-40 shrink-0" variant="rectangular" />
                </div>
              ))}
            </div>
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
                  {pagedPrograms.map((plan) => (
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
          {!isLoading && filtered.length > 0 ? (
            <div className="px-6 pb-4">
              <ListPagination
                page={page}
                pageSize={pageSize}
                totalCount={filteredTotal}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            </div>
          ) : null}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <ProgramWizard
        key={`${editing?.id ?? 'new'}-${modalOpen}`}
        open={modalOpen}
        editing={Boolean(editing)}
        initialForm={wizardInitialForm}
        exercises={exercises}
        categories={categories}
        trainers={trainers}
        error={formError}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onClose={handleCloseModal}
        onSubmit={handleWizardSubmit}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete program"
        message={
          <>
            Delete <span className="font-semibold text-white">{deleteConfirm.target?.name}</span>?
            {(deleteConfirm.target?.assignedMembersCount ?? 0) > 0 && (
              <span className="mt-2 block text-rose-300/90">
                {deleteConfirm.target?.assignedMembersCount} member assignment(s) reference this program.
              </span>
            )}
            <span className="mt-2 block text-slate-500">This action cannot be undone.</span>
          </>
        }
        confirmLabel="Delete program"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteConfirm.target && deleteMutation.mutate(deleteConfirm.target.id)}
        onCancel={deleteConfirm.close}
      />
    </DashboardLayout>
  )
}
