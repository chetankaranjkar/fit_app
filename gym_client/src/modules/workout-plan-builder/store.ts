import { create } from 'zustand'
import type { BuilderDay, BuilderExercise, BuilderPlanInput } from './types'

interface WorkoutPlanBuilderState {
  planId: number | null
  planForm: BuilderPlanInput
  activeDayId: number | null
  days: BuilderDay[]
  exercises: BuilderExercise[]
  setPlanId: (planId: number | null) => void
  setPlanForm: (patch: Partial<BuilderPlanInput>) => void
  setActiveDayId: (dayId: number | null) => void
  hydrateFromApi: (payload: {
    planId: number
    days: BuilderDay[]
    exercises: Array<{
      id: number
      workoutPlanDayId: number
      exerciseId: number
      exerciseName: string
      sets?: number
      reps?: number
      restTime?: number
      orderIndex: number
    }>
  }) => void
}

export const useWorkoutPlanBuilderStore = create<WorkoutPlanBuilderState>((set) => ({
  planId: null,
  planForm: {
    name: '',
    goal: 'Muscle Gain',
    duration: 30,
    difficulty: 'Intermediate',
  },
  activeDayId: null,
  days: [],
  exercises: [],
  setPlanId: (planId) => set({ planId }),
  setPlanForm: (patch) => set((state) => ({ planForm: { ...state.planForm, ...patch } })),
  setActiveDayId: (dayId) => set({ activeDayId: dayId }),
  hydrateFromApi: ({ planId, days, exercises }) =>
    set({
      planId,
      days,
      activeDayId: days[0]?.id ?? null,
      exercises: exercises.map((item) => ({
        id: item.id,
        clientKey: String(item.id),
        exerciseId: item.exerciseId,
        name: item.exerciseName,
        sets: item.sets ?? 3,
        reps: item.reps ?? 10,
        restTime: item.restTime ?? 60,
        orderIndex: item.orderIndex,
        dayId: item.workoutPlanDayId,
      })),
    }),
}))
