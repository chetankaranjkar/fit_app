import { useQuery } from '@tanstack/react-query'
import { exercisesService } from '../services/exercises.service'
import type { Exercise } from '../types/exercise'

export const EXERCISE_PICKER_QUERY_KEY = ['exercises-picker'] as const

/** Shared exercise picker for plan builders. Keeps the last successful list on refetch failure. */
export function useExercisePickerLibrary() {
  return useQuery({
    queryKey: EXERCISE_PICKER_QUERY_KEY,
    queryFn: async (): Promise<Exercise[]> => {
      const { data } = await exercisesService.getPaged({ page: 1, pageSize: 200 })
      return data.items ?? []
    },
    placeholderData: (previous) => previous,
    retry: 1,
  })
}
