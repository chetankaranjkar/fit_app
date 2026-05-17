import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronDown,
  Dumbbell,
  Layers,
  Pencil,
  Search,
  Target,
  X,
} from 'lucide-react'
import { DayBuilder } from './components/DayBuilder'
import { DayTabs } from './components/DayTabs'
import { ExerciseDropZone } from './components/ExerciseDropZone'
import { PlanForm } from './components/PlanForm'
import { useExerciseLibrary, useWorkoutPlan, useWorkoutPlanMutations } from './hooks'
import { useWorkoutPlanBuilderStore } from './store'
import type { BuilderDay, BuilderExercise } from './types'

interface LibraryItem {
  id: number
  name: string
  difficulty?: string | null
  category?: string | null
}

const DIFFICULTY_TONE: Record<string, string> = {
  beginner: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  intermediate: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  advanced: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
}

function difficultyClass(value?: string | null) {
  if (!value) return 'border-white/10 bg-white/5 text-slate-300'
  return DIFFICULTY_TONE[value.toLowerCase()] ?? 'border-white/10 bg-white/5 text-slate-300'
}

function LibraryCard({
  item,
  onAdd,
  canAdd,
}: {
  item: LibraryItem
  onAdd: (item: LibraryItem) => void
  canAdd: boolean
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(event) => {
        const payload = JSON.stringify({ id: item.id, name: item.name })
        event.dataTransfer.setData('application/x-workout-exercise', payload)
        event.dataTransfer.setData('text/plain', payload)
        event.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={() => canAdd && onAdd(item)}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && canAdd) {
          event.preventDefault()
          onAdd(item)
        }
      }}
      className={`group flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-gradient-to-r from-slate-950/80 to-slate-900/60 px-2.5 py-2 text-left transition ${
        canAdd ? 'cursor-grab hover:border-sky-400/40 active:cursor-grabbing' : 'cursor-not-allowed opacity-60'
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-sky-300 ring-1 ring-inset ring-white/5">
        <Dumbbell size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-white">{item.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="truncate">{item.category ?? 'General'}</span>
          {item.difficulty ? (
            <>
              <span className="text-slate-600">·</span>
              <span
                className={`rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.08em] ${difficultyClass(item.difficulty)}`}
              >
                {item.difficulty}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function WorkoutPlanBuilderPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [editingPlan, setEditingPlan] = useState(false)
  const {
    planId,
    planForm,
    activeDayId,
    days,
    exercises,
    setPlanForm,
    setPlanId,
    setActiveDayId,
    hydrateFromApi,
  } = useWorkoutPlanBuilderStore()
  const { data: library = [] } = useExerciseLibrary(search)
  const { data: plan } = useWorkoutPlan(planId)
  const {
    createWorkoutPlan,
    addWorkoutDay,
    updateWorkoutDay,
    addWorkoutDayExercise,
    updateWorkoutExercise,
    deleteWorkoutExercise,
  } = useWorkoutPlanMutations()

  useEffect(() => {
    if (!plan) return
    hydrateFromApi({
      planId: plan.id,
      days: plan.days.map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        name: day.name,
        isRestDay: day.isRestDay,
        orderIndex: day.orderIndex,
      })),
      exercises: plan.exercises,
    })
  }, [plan, hydrateFromApi])

  useEffect(() => {
    if (activeDayId) return
    const first = days[0]
    if (first) setActiveDayId(first.id)
  }, [days, activeDayId, setActiveDayId])

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  function describeError(error: unknown, fallback: string) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { message?: string; error?: string } | undefined
      const apiMessage = data?.message ?? data?.error
      if (apiMessage) return apiMessage
      if (error.response?.status) return `${fallback} (HTTP ${error.response.status})`
      if (error.code === 'ERR_NETWORK') return `${fallback} — backend unreachable. Is the API running?`
      return `${fallback}: ${error.message}`
    }
    if (error instanceof Error) return `${fallback}: ${error.message}`
    return fallback
  }

  async function handleCreatePlan() {
    if (!planForm.name.trim()) {
      toast.error('Plan name is required')
      return
    }
    if (!planForm.goal?.trim()) {
      toast.error('Pick a goal for the plan')
      return
    }
    if (!planForm.difficulty?.trim()) {
      toast.error('Pick a difficulty')
      return
    }

    try {
      const payload = {
        ...planForm,
        name: planForm.name.trim(),
        goal: planForm.goal.trim(),
        duration: Math.max(1, Number(planForm.duration) || 30),
      }
      const created = await createWorkoutPlan.mutateAsync(payload)
      setPlanId(created.id)
      for (let i = 0; i < 7; i += 1) {
        try {
          await addWorkoutDay.mutateAsync({
            planId: created.id,
            input: {
              dayNumber: i + 1,
              name: `Day ${i + 1}`,
              isRestDay: false,
              orderIndex: i,
            },
          })
        } catch (dayError) {
          // Don't fail the whole flow if a day insert fails — surface and continue.
          // eslint-disable-next-line no-console
          console.warn('addWorkoutDay failed', dayError)
        }
      }
      toast.success('Program created')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('createWorkoutPlan failed', error)
      toast.error(describeError(error, 'Failed to create plan'))
    }
  }

  const dayExercises = useMemo(
    () => exercises.filter((item) => item.dayId === activeDayId).sort((a, b) => a.orderIndex - b.orderIndex),
    [exercises, activeDayId],
  )

  const planStats = useMemo(() => {
    const trainingDays = days.filter((day) => !day.isRestDay).length
    const restDays = days.length - trainingDays
    return {
      totalDays: days.length,
      trainingDays,
      restDays,
      totalExercises: exercises.length,
    }
  }, [days, exercises])

  async function handleAddExercise(dayId: number, exercise: { id: number; name: string }) {
    if (!planId) return
    try {
      await addWorkoutDayExercise.mutateAsync({
        dayId,
        input: {
          exerciseId: exercise.id,
          orderIndex: dayExercises.length,
          sets: 3,
          reps: 10,
          restTime: 60,
        },
      })
      toast.success('Exercise added')
    } catch {
      toast.error('Failed to add exercise')
    }
  }

  async function handleChangeExercise(item: BuilderExercise, patch: Partial<BuilderExercise>) {
    try {
      await updateWorkoutExercise.mutateAsync({
        exerciseRowId: item.id,
        input: {
          orderIndex: patch.orderIndex,
          sets: patch.sets,
          reps: patch.reps,
          restTime: patch.restTime,
        },
      })
    } catch {
      toast.error('Failed to update exercise')
    }
  }

  async function handleDeleteExercise(item: BuilderExercise) {
    if (!window.confirm(`Delete "${item.name}" from this day?`)) return
    try {
      await deleteWorkoutExercise.mutateAsync(item.id)
      toast.success('Exercise deleted')
    } catch {
      toast.error('Failed to delete exercise')
    }
  }

  async function handleReorder(items: BuilderExercise[]) {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]
      if (item.orderIndex !== i) {
        await handleChangeExercise(item, { orderIndex: i })
      }
    }
  }

  async function handleRenameDay(dayId: number, name: string) {
    await updateWorkoutDay.mutateAsync({ dayId, input: { name } })
  }

  async function handleToggleRest(dayId: number, isRestDay: boolean) {
    await updateWorkoutDay.mutateAsync({ dayId, input: { isRestDay } })
  }

  async function handleDuplicateDay(day: BuilderDay) {
    if (!planId) return
    const payload = await addWorkoutDay.mutateAsync({
      planId,
      input: {
        dayNumber: Math.min(7, day.dayNumber + 1),
        name: `${day.name} Copy`,
        isRestDay: day.isRestDay,
        orderIndex: day.orderIndex + 1,
      },
    })
    const newDay = payload.days.find((item) => item.name === `${day.name} Copy`)
    if (!newDay) return
    const sourceExercises = exercises.filter((item) => item.dayId === day.id)
    for (const item of sourceExercises) {
      await addWorkoutDayExercise.mutateAsync({
        dayId: newDay.id,
        input: {
          exerciseId: item.exerciseId,
          orderIndex: item.orderIndex,
          sets: item.sets,
          reps: item.reps,
          restTime: item.restTime,
        },
      })
    }
    toast.success('Day duplicated')
  }

  const activeDay = days.find((day) => day.id === activeDayId) ?? null
  const hasPlan = Boolean(planId)

  return (
    <div className="fixed inset-0 z-100 bg-slate-950/85 p-3 backdrop-blur-sm md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex h-full min-w-0 max-w-full flex-col rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,#1e293b,#020617)] p-4 text-slate-100 shadow-2xl md:p-6"
      >
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-300/70">Training Module</p>
            <h1 className="text-xl font-semibold text-white md:text-2xl">Program Builder</h1>
          </div>

          {hasPlan ? (
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/60 p-1.5 text-[11px] text-slate-200">
              <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5">
                <Target size={13} className="text-sky-300" />
                <span className="truncate font-semibold">{planForm.name || 'Untitled'}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5">
                <CalendarDays size={13} className="text-amber-300" />
                <span className="font-semibold">{planStats.trainingDays}</span>
                <span className="text-slate-400">train</span>
                <span className="text-slate-600">·</span>
                <span className="font-semibold">{planStats.restDays}</span>
                <span className="text-slate-400">rest</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5">
                <Layers size={13} className="text-violet-300" />
                <span className="font-semibold">{planStats.totalExercises}</span>
                <span className="text-slate-400">exercises</span>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            {hasPlan ? (
              <button
                onClick={() => setEditingPlan((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                <Pencil size={13} />
                Edit Plan
                <ChevronDown
                  size={13}
                  className={`transition ${editingPlan ? 'rotate-180' : ''}`}
                />
              </button>
            ) : null}
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <X size={14} />
              Close
            </button>
          </div>
        </div>

        {/* ─── Inline plan editor (only when editing an existing plan) ── */}
        <AnimatePresence initial={false}>
          {hasPlan && editingPlan ? (
            <motion.div
              key="edit-plan"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <PlanForm
                value={planForm}
                onChange={setPlanForm}
                onCreate={() => setEditingPlan(false)}
                creating={false}
                variant="inline"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ─── No plan yet → centered hero ─────────────────────────── */}
        {!hasPlan ? (
          <div className="flex flex-1 items-center justify-center overflow-auto py-6">
            <PlanForm
              value={planForm}
              onChange={setPlanForm}
              onCreate={() => void handleCreatePlan()}
              creating={createWorkoutPlan.isPending}
              variant="hero"
            />
          </div>
        ) : (
          /* ─── 3-column workspace ───────────────────────────────── */
          <div className="grid flex-1 grid-cols-12 gap-4 overflow-auto xl:min-h-0 xl:overflow-hidden">
            {/* Library */}
            <section className="col-span-12 flex min-h-0 flex-col rounded-2xl border border-white/10 bg-slate-950/60 p-3 xl:col-span-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">Library</p>
                  <p className="text-sm font-semibold text-white">Exercises</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                  {library.length}
                </span>
              </div>
              <div className="relative mb-2">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search exercises…"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 pl-8 pr-2 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                />
              </div>
              <div className="min-h-0 flex-1 space-y-1.5 overflow-auto pr-1">
                {library.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center px-4 text-center text-xs text-slate-500">
                    <Search size={20} className="mb-2 opacity-50" />
                    No exercises match your search.
                  </div>
                ) : (
                  library.map((item) => (
                    <LibraryCard
                      key={item.id}
                      item={item}
                      onAdd={(it) => activeDayId && handleAddExercise(activeDayId, it)}
                      canAdd={Boolean(activeDayId) && !activeDay?.isRestDay}
                    />
                  ))
                )}
              </div>
              {activeDay?.isRestDay ? (
                <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-200">
                  This day is marked as rest. Toggle it to add exercises.
                </p>
              ) : null}
            </section>

            {/* Center — active day's workout */}
            <section className="col-span-12 flex min-h-0 flex-col rounded-2xl border border-white/10 bg-slate-950/60 p-3 xl:col-span-6">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Workout</p>
                  <p className="text-sm font-semibold text-white">
                    {activeDay ? activeDay.name : 'Select a day'}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                  {dayExercises.length} exercises
                </span>
              </div>
              <div className="mb-2">
                <DayTabs
                  days={days}
                  activeDayId={activeDayId}
                  onSelect={setActiveDayId}
                  exercises={exercises}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-auto pr-1">
                {activeDay?.isRestDay ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400/20 bg-amber-500/5 p-6 text-center text-amber-200">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em]">Rest Day</p>
                    <p className="text-[12px] text-amber-200/80">
                      Recovery time — no exercises scheduled. Switch this day to a training day from the right panel to add work.
                    </p>
                  </div>
                ) : (
                  <ExerciseDropZone
                    items={dayExercises}
                    onReorder={(items) => void handleReorder(items)}
                    onChange={(item, patch) => void handleChangeExercise(item, patch)}
                    onDelete={(item) => void handleDeleteExercise(item)}
                    onExternalDrop={(exercise) => activeDayId && void handleAddExercise(activeDayId, exercise)}
                  />
                )}
              </div>
            </section>

            {/* Right — Days panel */}
            <section className="col-span-12 flex min-h-0 flex-col xl:col-span-3">
              <DayBuilder
                days={days}
                activeDayId={activeDayId}
                onSelectDay={setActiveDayId}
                onRename={(id, name) => void handleRenameDay(id, name)}
                onToggleRest={(id, value) => void handleToggleRest(id, value)}
                onDuplicate={(day) => void handleDuplicateDay(day)}
                exercises={exercises}
              />
            </section>
          </div>
        )}
      </motion.div>
    </div>
  )
}
