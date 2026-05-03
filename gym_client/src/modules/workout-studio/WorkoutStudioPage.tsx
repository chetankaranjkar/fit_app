import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, Dumbbell, Layers, Save, Search, X } from 'lucide-react'
import { exercisesService } from '../../services/exercises.service'
import { workoutPlansService } from '../../services/workoutPlans.service'
import type { CreateWorkoutPlanDto, WorkoutType } from '../../types/workoutPlan'
import { ExerciseCard } from './components/ExerciseCard'
import { StudioRightPanel } from './components/StudioRightPanel'
import { WorkoutCanvas } from './components/WorkoutCanvas'
import { WorkoutDayTabs } from './components/WorkoutDayTabs'
import { useExerciseLibrary, useWorkoutMutations, useWorkouts } from './hooks'
import { useWorkoutStudioStore } from './store'
import type { ExerciseLibraryItem, WorkoutCanvasExercise } from './types'

export function WorkoutStudioPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null)
  const [selectedClientKey, setSelectedClientKey] = useState<string | null>(null)
  const [aiSourceLabel, setAiSourceLabel] = useState<'openai' | 'huggingface' | 'fallback' | null>(null)
  const { data: library = [], isLoading } = useExerciseLibrary(search)
  const { data: workouts = [] } = useWorkouts()
  const {
    activeWorkout,
    activeDayId,
    setActiveDayId,
    setLibrary,
    setActiveWorkout,
    addToCanvas,
    reorderCanvas,
    updateCanvasExercise,
    removeCanvasExercise,
    duplicateCanvasExercise,
    applyAiPlan,
  } = useWorkoutStudioStore()
  const { generateAiWorkout, createWorkout, addWorkoutExercise, reorderWorkoutExercises, updateWorkoutExercise, deleteWorkoutExercise } = useWorkoutMutations()
  useEffect(() => {
    setLibrary(library)
  }, [library, setLibrary])
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])
  useEffect(() => {
    const current = activeWorkout
    if (current?.id) return
    const first = workouts[0]
    if (first?.id) {
      setActiveWorkout(first)
      return
    }
    if (!createWorkout.isPending) {
      createWorkout.mutate(
        {
          name: 'Untitled Workout Template',
          description: 'Auto-created studio template',
          goal: 'General Fitness',
          difficulty: 'Intermediate',
          duration: 60,
          days: [
            { dayName: 'Day 1', orderIndex: 0 },
            { dayName: 'Day 2', orderIndex: 1 },
            { dayName: 'Day 3', orderIndex: 2 },
          ],
        },
        {
          onSuccess: (created) => setActiveWorkout(created),
        },
      )
    }
  }, [activeWorkout, workouts, setActiveWorkout, createWorkout])

  const filteredCanvas = useMemo(
    () => (activeWorkout?.exercises ?? []).filter((item) => !activeDayId || item.workoutDayId === activeDayId),
    [activeWorkout?.exercises, activeDayId],
  )

  const selectedCanvasExercise = useMemo(() => {
    const list = activeWorkout?.exercises ?? []
    if (selectedClientKey) {
      const byKey = list.find((item) => item.clientKey === selectedClientKey)
      if (byKey) return byKey
    }
    if (selectedExerciseName) {
      const byName = list.find((item) => item.name === selectedExerciseName)
      if (byName) return byName
    }
    return filteredCanvas[0] ?? null
  }, [activeWorkout?.exercises, filteredCanvas, selectedClientKey, selectedExerciseName])

  const coachExerciseName = selectedCanvasExercise?.name ?? selectedExerciseName ?? null

  const planStats = useMemo(() => {
    const list = activeWorkout?.exercises ?? []
    const totalSets = list.reduce((sum, e) => sum + (e.sets ?? 0), 0)
    const estSeconds = list.reduce((sum, e) => {
      const sets = e.sets ?? 0
      const reps = e.reps ?? 0
      const rest = e.restTime ?? 0
      // ~3s per rep + rest between sets
      return sum + sets * (reps * 3 + rest)
    }, 0)
    return {
      exerciseCount: list.length,
      totalSets,
      estMinutes: Math.max(0, Math.round(estSeconds / 60)),
      dayCount: activeWorkout?.days?.length ?? 0,
    }
  }, [activeWorkout?.exercises, activeWorkout?.days])

  function addExerciseToWorkout(exercise: ExerciseLibraryItem) {
    addToCanvas(exercise)
    setSelectedExerciseName(exercise.name)
    setSelectedClientKey(null)
    const workoutId = activeWorkout?.id
    if (!workoutId) return
    addWorkoutExercise.mutate(
      {
        workoutId,
        payload: {
          exerciseId: exercise.id,
          workoutDayId: activeDayId,
          orderIndex: filteredCanvas.length,
          sets: 3,
          reps: 10,
          restTime: 60,
        },
      },
      {
        onSuccess: (updated) => setActiveWorkout(updated),
        onError: () => toast.error('Failed to sync exercise add'),
      },
    )
  }

  function closeStudio() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/dashboard/training/exercises-premium')
  }

  function inferWorkoutType(goal?: string | null): WorkoutType {
    const value = (goal ?? '').toLowerCase()
    if (value.includes('hiit')) return 'ShortHIIT'
    if (value.includes('cardio') || value.includes('fat')) return 'Cardio'
    if (value.includes('warm')) return 'Warmup'
    return 'Strength'
  }

  function normalizeName(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  }

  async function handleSaveTemplate() {
    if (!activeWorkout) {
      toast.error('No active workout to save')
      return
    }

    const sortedExercises = [...(activeWorkout.exercises ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
    const { data: legacyExercisesResponse } = await exercisesService.getAll()
    const legacyExercises = Array.isArray(legacyExercisesResponse) ? legacyExercisesResponse : []
    const legacyByName = new Map<string, number>()
    legacyExercises.forEach((exercise) => {
      if (typeof exercise.id === 'number' && exercise.id > 0) {
        legacyByName.set(normalizeName(exercise.name), exercise.id)
      }
    })

    const mappedExercises = sortedExercises
      .map((exercise, index) => {
        const numericExerciseId = Number(exercise.id)
        const bridgedId =
          Number.isInteger(numericExerciseId) && numericExerciseId > 0
            ? numericExerciseId
            : legacyByName.get(normalizeName(exercise.name))
        if (!bridgedId) return null
        return {
          exerciseId: bridgedId,
          sets: Math.max(1, exercise.sets ?? 3),
          reps: Math.max(1, exercise.reps ?? 10),
          restBetweenSets: Math.max(0, exercise.restTime ?? 60),
          order: index + 1,
          weight: exercise.weight ?? null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    if (mappedExercises.length === 0) {
      toast.error('Template has no bridgeable exercises for Workout Plans sync')
      return
    }

    const payload: CreateWorkoutPlanDto = {
      name: activeWorkout.name?.trim() || 'Workout Studio Template',
      description:
        activeWorkout.description?.trim() ||
        `Synced from Workout Studio (${new Date().toLocaleDateString()})`,
      workoutType: inferWorkoutType(activeWorkout.goal),
      duration: Math.max(10, Number(activeWorkout.duration ?? 60)),
      difficultyLevel: activeWorkout.difficulty?.trim() || 'Intermediate',
      isPublic: false,
      exercises: mappedExercises,
    }

    try {
      await workoutPlansService.create(payload)
      if (mappedExercises.length < sortedExercises.length) {
        toast.success(
          `Template saved with ${mappedExercises.length}/${sortedExercises.length} bridged exercises.`,
        )
      } else {
        toast.success('Template saved to Workout Plans')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save template'
      toast.error(message)
    }
  }

  return (
    <div className="fixed inset-0 z-100 bg-slate-950/85 p-3 backdrop-blur-sm md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex h-full min-w-0 max-w-full flex-col rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,#1e293b,#020617)] p-4 text-slate-100 shadow-2xl md:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-300/70">Workout Studio</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-white md:text-2xl">Workout Plan Builder</h1>
              {aiSourceLabel ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    aiSourceLabel === 'openai'
                      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30'
                      : aiSourceLabel === 'huggingface'
                        ? 'bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-400/30'
                        : 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-400/30'
                  }`}
                >
                  {aiSourceLabel}
                </span>
              ) : null}
            </div>
          </div>

          {/* Live stat strip */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/60 p-1.5 text-[11px] text-slate-200">
            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5">
              <Dumbbell size={13} className="text-sky-300" />
              <span className="font-semibold">{planStats.exerciseCount}</span>
              <span className="text-slate-400">exercises</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5">
              <Layers size={13} className="text-violet-300" />
              <span className="font-semibold">{planStats.totalSets}</span>
              <span className="text-slate-400">sets</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5">
              <Clock size={13} className="text-emerald-300" />
              <span className="font-semibold">~{planStats.estMinutes}</span>
              <span className="text-slate-400">min</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5">
              <CalendarDays size={13} className="text-amber-300" />
              <span className="font-semibold">{planStats.dayCount}</span>
              <span className="text-slate-400">days</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleSaveTemplate()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-violet-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_8px_24px_-10px_rgba(56,189,248,0.6)] transition hover:opacity-95"
            >
              <Save size={14} />
              Save Template
            </button>
            <button
              onClick={closeStudio}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <X size={14} />
              Close
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-12 gap-4 overflow-auto xl:min-h-0 xl:overflow-hidden">
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
              {isLoading ? (
                <div className="space-y-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-800/60" />
                  ))}
                </div>
              ) : library.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center text-xs text-slate-500">
                  <Search size={20} className="mb-2 opacity-50" />
                  No exercises match your search.
                </div>
              ) : (
                library.map((item) => (
                  <ExerciseCard key={item.id} item={item} onAdd={addExerciseToWorkout} />
                ))
              )}
            </div>
          </section>

          <section className="col-span-12 flex min-h-0 flex-col rounded-2xl border border-white/10 bg-slate-950/60 p-3 xl:col-span-6">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Canvas</p>
                <p className="text-sm font-semibold text-white">{activeWorkout?.name ?? 'Workout'}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                {filteredCanvas.length} on screen
              </span>
            </div>
            {activeWorkout?.days?.length ? (
              <WorkoutDayTabs
                days={activeWorkout.days}
                activeDayId={activeDayId}
                onSelect={setActiveDayId}
                exercises={activeWorkout.exercises ?? []}
              />
            ) : null}
            <div className="min-h-0 flex-1 overflow-auto pr-1">
            <WorkoutCanvas
              items={filteredCanvas}
              selectedClientKey={selectedClientKey}
              onSelect={(item) => {
                setSelectedExerciseName(item.name)
                setSelectedClientKey(item.clientKey)
              }}
              onReorder={(items) => {
                const current = activeWorkout?.exercises ?? []
                let dayCursor = 0
                const merged = current.map((exercise) => {
                  if (exercise.workoutDayId === activeDayId) {
                    const replacement = items[dayCursor]
                    dayCursor += 1
                    return replacement ?? exercise
                  }
                  return exercise
                })
                const normalized = merged.map((exercise, index) => ({
                  ...exercise,
                  orderIndex: index,
                }))
                reorderCanvas(normalized as WorkoutCanvasExercise[])
                if (!activeWorkout?.id) return
                const reorderItems = items
                  .filter((item) => item.workoutExerciseId)
                  .map((item, index) => ({
                    id: item.workoutExerciseId as string,
                    orderIndex: index,
                    workoutDayId: item.workoutDayId ?? null,
                  }))
                reorderWorkoutExercises.mutate(
                  { workoutId: activeWorkout.id, items: reorderItems },
                  {
                    onSuccess: (updated) => setActiveWorkout(updated),
                    onError: () => toast.error('Failed to sync reorder'),
                  },
                )
              }}
              onChange={(index, patch) => {
                const target = filteredCanvas[index]
                const globalIndex = (activeWorkout?.exercises ?? []).findIndex(
                  (item) => item.clientKey === target?.clientKey,
                )
                if (globalIndex >= 0) updateCanvasExercise(globalIndex, patch)
                if (!target?.workoutExerciseId) return
                updateWorkoutExercise.mutate(
                  { id: target.workoutExerciseId, payload: patch as Record<string, unknown> },
                  {
                    onSuccess: (updated) => setActiveWorkout(updated),
                    onError: () => toast.error('Failed to sync exercise update'),
                  },
                )
              }}
              onDelete={(index) => {
                const target = filteredCanvas[index]
                const globalIndex = (activeWorkout?.exercises ?? []).findIndex(
                  (item) => item.clientKey === target?.clientKey,
                )
                if (globalIndex >= 0) removeCanvasExercise(globalIndex)
                if (!target?.workoutExerciseId) return
                deleteWorkoutExercise.mutate(target.workoutExerciseId, {
                  onSuccess: (updated) => setActiveWorkout(updated),
                  onError: () => toast.error('Failed to sync delete'),
                })
              }}
              onDuplicate={(index) => {
                const source = filteredCanvas[index]
                const globalIndex = (activeWorkout?.exercises ?? []).findIndex(
                  (item) => item.clientKey === source?.clientKey,
                )
                if (globalIndex >= 0) duplicateCanvasExercise(globalIndex)
                if (!source || !activeWorkout?.id) return
                addWorkoutExercise.mutate(
                  {
                    workoutId: activeWorkout.id,
                    payload: {
                      exerciseId: source.id,
                      workoutDayId: source.workoutDayId,
                      orderIndex: source.orderIndex + 1,
                      sets: source.sets,
                      reps: source.reps,
                      weight: source.weight,
                      restTime: source.restTime,
                      duration: source.duration,
                      notes: source.notes,
                    },
                  },
                  {
                    onSuccess: (updated) => setActiveWorkout(updated),
                    onError: () => toast.error('Failed to sync duplicate'),
                  },
                )
              }}
              onExternalDrop={(exercise) => addExerciseToWorkout(exercise)}
            />
            </div>
          </section>

          <section className="col-span-12 flex min-h-0 flex-col xl:col-span-3">
            <StudioRightPanel
              selectedExercise={selectedCanvasExercise}
              selectedExerciseName={coachExerciseName}
              aiLoading={generateAiWorkout.isPending}
              onAiSubmit={async (payload) => {
                try {
                  const result = await generateAiWorkout.mutateAsync(payload)
                  setAiSourceLabel(result.source)
                  const days = result.plan.map((d) => d.day)
                  const byDay = Object.fromEntries(
                    result.plan.map((d) => [
                      d.day,
                      d.exercises.map((exercise) => ({
                        clientKey: crypto.randomUUID(),
                        id: crypto.randomUUID(),
                        name: exercise.name,
                        category: 'AI',
                        muscleGroupPrimary: d.focus ?? 'General',
                        difficulty: payload.experience,
                        orderIndex: 0,
                        sets: exercise.sets,
                        reps: Number(String(exercise.reps).split('-')[0] ?? 10),
                        restTime: Number(String(exercise.rest).replace(/\D/g, '') || 60),
                        isExpanded: true,
                      })),
                    ]),
                  )
                  applyAiPlan({
                    name: `${payload.goal} - AI Plan`,
                    days,
                    exercisesByDay: byDay,
                  })
                  if (result.source === 'fallback') {
                    toast('AI service unavailable. Applied local fallback workout.', { icon: '⚠️' })
                  } else {
                    toast.success('AI workout generated successfully')
                  }
                } catch {
                  toast.error('Could not generate workout right now')
                }
              }}
            />
          </section>
        </div>
      </motion.div>
    </div>
  )
}
