import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addWorkoutDay,
  addWorkoutDayExercise,
  createWorkoutPlan,
  deleteWorkoutDay,
  deleteWorkoutExercise,
  fetchExerciseLibrary,
  getWorkoutPlan,
  updateWorkoutDay,
  updateWorkoutExercise,
} from './api'

export function useExerciseLibrary(search?: string) {
  return useQuery({
    queryKey: ['workout-plan-builder', 'library', search ?? ''],
    queryFn: () => fetchExerciseLibrary(search),
  })
}

export function useWorkoutPlan(planId: number | null) {
  return useQuery({
    queryKey: ['workout-plan-builder', 'plan', planId],
    queryFn: () => getWorkoutPlan(planId as number),
    enabled: Boolean(planId),
  })
}

export function useWorkoutPlanMutations() {
  const queryClient = useQueryClient()
  const invalidate = (planId?: number) => {
    void queryClient.invalidateQueries({ queryKey: ['workout-plan-builder'] })
    if (planId) void queryClient.invalidateQueries({ queryKey: ['workout-plan-builder', 'plan', planId] })
  }

  return {
    createWorkoutPlan: useMutation({
      mutationFn: createWorkoutPlan,
      onSuccess: (data) => invalidate(data.id),
    }),
    addWorkoutDay: useMutation({
      mutationFn: ({ planId, input }: { planId: number; input: Parameters<typeof addWorkoutDay>[1] }) => addWorkoutDay(planId, input),
      onSuccess: (data) => invalidate(data.id),
    }),
    updateWorkoutDay: useMutation({
      mutationFn: ({ dayId, input }: { dayId: number; input: Parameters<typeof updateWorkoutDay>[1] }) => updateWorkoutDay(dayId, input),
      onSuccess: (data) => invalidate(data.id),
    }),
    deleteWorkoutDay: useMutation({
      mutationFn: deleteWorkoutDay,
      onSuccess: (data) => invalidate(data.id),
    }),
    addWorkoutDayExercise: useMutation({
      mutationFn: ({ dayId, input }: { dayId: number; input: Parameters<typeof addWorkoutDayExercise>[1] }) => addWorkoutDayExercise(dayId, input),
      onSuccess: (data) => invalidate(data.id),
    }),
    updateWorkoutExercise: useMutation({
      mutationFn: ({ exerciseRowId, input }: { exerciseRowId: number; input: Parameters<typeof updateWorkoutExercise>[1] }) =>
        updateWorkoutExercise(exerciseRowId, input),
      onSuccess: (data) => invalidate(data.id),
    }),
    deleteWorkoutExercise: useMutation({
      mutationFn: deleteWorkoutExercise,
      onSuccess: (data) => invalidate(data.id),
    }),
  }
}
