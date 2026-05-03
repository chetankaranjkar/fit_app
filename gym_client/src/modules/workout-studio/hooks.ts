import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addWorkoutExercise,
  createWorkout,
  deleteWorkoutExercise,
  fetchExerciseLibrary,
  fetchWorkoutById,
  fetchWorkouts,
  generateAiWorkout,
  reorderWorkoutExercises,
  updateWorkoutExercise,
} from './api'

export function useExerciseLibrary(search?: string) {
  return useQuery({
    queryKey: ['workout-studio', 'exercise-library', search ?? ''],
    queryFn: () => fetchExerciseLibrary(search),
  })
}

export function useWorkouts() {
  return useQuery({
    queryKey: ['workout-studio', 'workouts'],
    queryFn: () => fetchWorkouts(1, 30),
  })
}

export function useWorkoutById(id: string | null) {
  return useQuery({
    queryKey: ['workout-studio', 'workout', id],
    queryFn: () => fetchWorkoutById(id as string),
    enabled: Boolean(id),
  })
}

export function useWorkoutMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['workout-studio'] })
  }

  return {
    createWorkout: useMutation({
      mutationFn: createWorkout,
      onSuccess: invalidate,
    }),
    addWorkoutExercise: useMutation({
      mutationFn: ({ workoutId, payload }: { workoutId: string; payload: Parameters<typeof addWorkoutExercise>[1] }) =>
        addWorkoutExercise(workoutId, payload),
      onSuccess: invalidate,
    }),
    reorderWorkoutExercises: useMutation({
      mutationFn: ({ workoutId, items }: { workoutId: string; items: Array<{ id: string; orderIndex: number; workoutDayId?: string | null }> }) =>
        reorderWorkoutExercises(workoutId, items),
      onSuccess: invalidate,
    }),
    updateWorkoutExercise: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => updateWorkoutExercise(id, payload),
      onSuccess: invalidate,
    }),
    deleteWorkoutExercise: useMutation({
      mutationFn: deleteWorkoutExercise,
      onSuccess: invalidate,
    }),
    generateAiWorkout: useMutation({
      mutationFn: generateAiWorkout,
    }),
  }
}
