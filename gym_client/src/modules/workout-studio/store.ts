import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExerciseLibraryItem, Workout, WorkoutCanvasExercise } from './types'

interface WorkoutStudioState {
  activeWorkout: Workout | null
  activeDayId: string | null
  library: ExerciseLibraryItem[]
  setLibrary: (items: ExerciseLibraryItem[]) => void
  setActiveWorkout: (workout: Workout | null) => void
  setActiveDayId: (dayId: string | null) => void
  addToCanvas: (exercise: ExerciseLibraryItem) => void
  reorderCanvas: (items: WorkoutCanvasExercise[]) => void
  updateCanvasExercise: (index: number, patch: Partial<WorkoutCanvasExercise>) => void
  removeCanvasExercise: (index: number) => void
  duplicateCanvasExercise: (index: number) => void
  applyAiPlan: (input: { name: string; days: string[]; exercisesByDay: Record<string, WorkoutCanvasExercise[]> }) => void
}

function sortByOrder(items: WorkoutCanvasExercise[]) {
  return [...items]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item, index) => ({ ...item, orderIndex: index }))
}

export const useWorkoutStudioStore = create<WorkoutStudioState>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      activeDayId: null,
      library: [],
      setLibrary: (items) => set({ library: items }),
      setActiveWorkout: (workout) =>
        set({
          activeWorkout: workout
            ? {
                ...workout,
                exercises: sortByOrder(workout.exercises ?? []),
              }
            : null,
          activeDayId: workout?.days?.[0]?.id ?? null,
        }),
      setActiveDayId: (dayId) => set({ activeDayId: dayId }),
      addToCanvas: (exercise) => {
        let current = get().activeWorkout
        let activeDayId = get().activeDayId
        // If the workouts API hasn't produced an active workout yet (offline,
        // backend error, first load), create a local placeholder so the
        // studio is still usable. Server sync resumes once a real workout id
        // is set via setActiveWorkout.
        if (!current) {
          const placeholderDay = {
            id: crypto.randomUUID(),
            dayName: 'Day 1',
            orderIndex: 0,
          }
          current = {
            id: '',
            name: 'Untitled Workout Template',
            description: 'Local draft',
            days: [placeholderDay],
            exercises: [],
          }
          activeDayId = placeholderDay.id
          if (typeof console !== 'undefined') {
            console.warn(
              '[workout-studio] No active workout — created a local draft. ' +
                'Server sync will start once the workouts API succeeds.',
            )
          }
        }
        const next = [...current.exercises]
        next.push({
          clientKey: crypto.randomUUID(),
          ...exercise,
          workoutExerciseId: undefined,
          workoutDayId: activeDayId,
          orderIndex: next.length,
          sets: 3,
          reps: 10,
          restTime: 60,
          isExpanded: true,
        })
        set({
          activeWorkout: { ...current, exercises: sortByOrder(next) },
          activeDayId,
        })
      },
      reorderCanvas: (items) => {
        const current = get().activeWorkout
        if (!current) return
        set({ activeWorkout: { ...current, exercises: sortByOrder(items) } })
      },
      updateCanvasExercise: (index, patch) => {
        const current = get().activeWorkout
        if (!current) return
        const exercises = [...current.exercises]
        exercises[index] = { ...exercises[index], ...patch }
        set({ activeWorkout: { ...current, exercises } })
      },
      removeCanvasExercise: (index) => {
        const current = get().activeWorkout
        if (!current) return
        const exercises = current.exercises.filter((_, idx) => idx !== index)
        set({ activeWorkout: { ...current, exercises: sortByOrder(exercises) } })
      },
      duplicateCanvasExercise: (index) => {
        const current = get().activeWorkout
        if (!current) return
        const source = current.exercises[index]
        if (!source) return
        const duplicate = {
          ...source,
          clientKey: crypto.randomUUID(),
          workoutExerciseId: undefined,
          orderIndex: index + 1,
        }
        const exercises = [...current.exercises]
        exercises.splice(index + 1, 0, duplicate)
        set({ activeWorkout: { ...current, exercises: sortByOrder(exercises) } })
      },
      applyAiPlan: ({ name, days, exercisesByDay }) => {
        const normalizedDays = days.map((dayName, index) => ({
          id: crypto.randomUUID(),
          dayName,
          orderIndex: index,
        }))
        const byName = new Map(normalizedDays.map((day) => [day.dayName, day.id]))
        const exercises: WorkoutCanvasExercise[] = []
        Object.entries(exercisesByDay).forEach(([dayName, dayExercises]) => {
          const workoutDayId = byName.get(dayName) ?? null
          dayExercises.forEach((exercise, index) => {
            exercises.push({
              clientKey: crypto.randomUUID(),
              ...exercise,
              workoutDayId,
              orderIndex: exercises.length + index,
            })
          })
        })
        set({
          activeWorkout: {
            id: '',
            name,
            description: 'Generated by AI',
            days: normalizedDays,
            exercises: sortByOrder(exercises),
          },
          activeDayId: normalizedDays[0]?.id ?? null,
        })
      },
    }),
    {
      name: 'workout-studio-v1',
      partialize: (state) => ({
        activeWorkout: state.activeWorkout,
        activeDayId: state.activeDayId,
      }),
    },
  ),
)
