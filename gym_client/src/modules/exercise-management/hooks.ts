import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createExercise, deleteExercise, fetchExerciseById, fetchExercises, updateExercise } from './api'
import type { ExerciseFilters, ExerciseUpsertPayload } from './types'

export function useDebouncedValue<T>(value: T, delayMs = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [delayMs, value])
  return debounced
}

export function useExercisesQuery({
  page,
  pageSize,
  filters,
}: {
  page: number
  pageSize: number
  filters: ExerciseFilters
}) {
  const debouncedSearch = useDebouncedValue(filters.search)
  return useQuery({
    queryKey: ['premium-exercises', page, pageSize, debouncedSearch, filters.category, filters.difficulty, filters.equipment],
    queryFn: () =>
      fetchExercises({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        category: filters.category || undefined,
        difficulty: filters.difficulty || undefined,
        equipment: filters.equipment || undefined,
      }),
  })
}

export function useExerciseDetailQuery(id: string | null) {
  return useQuery({
    queryKey: ['premium-exercise-detail', id],
    queryFn: () => fetchExerciseById(String(id)),
    enabled: Boolean(id),
  })
}

export function useExerciseMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['premium-exercises'] })

  const create = useMutation({
    mutationFn: (payload: ExerciseUpsertPayload) => createExercise(payload),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ExerciseUpsertPayload }) =>
      updateExercise(id, payload),
    onSuccess: () => {
      invalidate()
      void qc.invalidateQueries({ queryKey: ['premium-exercise-detail'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteExercise(id),
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
