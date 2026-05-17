import axios from 'axios'
import { api } from '../../lib/api'
import { fetchExercises } from '../exercise-management/api'
import type { BuilderPlanInput, WorkoutPlanBuilderResponse } from './types'

const EXERCISE_API_BASE_URL =
  import.meta.env.VITE_EXERCISE_API_URL?.trim() || '/exercise-api/api'

async function requestWithExerciseApiFallback<T>(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  body?: unknown,
) {
  try {
    return await api.request<T>({ method, url: path, data: body })
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error

    const shouldRetryOnExerciseApi = error.code === 'ERR_NETWORK' || error.response?.status === 404
    if (!shouldRetryOnExerciseApi) throw error

    return api.request<T>({
      method,
      url: `${EXERCISE_API_BASE_URL}${path}`,
      data: body,
    })
  }
}

export async function createWorkoutPlan(input: BuilderPlanInput) {
  const { data } = await requestWithExerciseApiFallback<{ success: boolean; data: WorkoutPlanBuilderResponse }>(
    'post',
    '/workout-plans',
    input,
  )
  return data.data
}

export async function getWorkoutPlan(planId: number) {
  const { data } = await requestWithExerciseApiFallback<{ success: boolean; data: WorkoutPlanBuilderResponse }>(
    'get',
    `/workout-plans/${planId}`,
  )
  return data.data
}

export async function addWorkoutDay(planId: number, input: { dayNumber: number; name: string; isRestDay?: boolean; orderIndex: number }) {
  const { data } = await requestWithExerciseApiFallback<{ success: boolean; data: WorkoutPlanBuilderResponse }>(
    'post',
    `/workout-plans/${planId}/days`,
    input,
  )
  return data.data
}

export async function updateWorkoutDay(dayId: number, input: { name?: string; isRestDay?: boolean; orderIndex?: number }) {
  const { data } = await requestWithExerciseApiFallback<{ success: boolean; data: WorkoutPlanBuilderResponse }>(
    'put',
    `/workout-days/${dayId}`,
    input,
  )
  return data.data
}

export async function deleteWorkoutDay(dayId: number) {
  const { data } = await requestWithExerciseApiFallback<{ success: boolean; data: WorkoutPlanBuilderResponse }>(
    'delete',
    `/workout-days/${dayId}`,
  )
  return data.data
}

export async function addWorkoutDayExercise(dayId: number, input: { exerciseId: number; orderIndex: number; sets?: number; reps?: number; restTime?: number }) {
  const { data } = await requestWithExerciseApiFallback<{ success: boolean; data: WorkoutPlanBuilderResponse }>(
    'post',
    `/workout-days/${dayId}/exercises`,
    input,
  )
  return data.data
}

export async function updateWorkoutExercise(exerciseRowId: number, input: { orderIndex?: number; sets?: number; reps?: number; restTime?: number }) {
  const { data } = await requestWithExerciseApiFallback<{ success: boolean; data: WorkoutPlanBuilderResponse }>(
    'put',
    `/workout-exercises/${exerciseRowId}`,
    input,
  )
  return data.data
}

export async function deleteWorkoutExercise(exerciseRowId: number) {
  const { data } = await requestWithExerciseApiFallback<{ success: boolean; data: WorkoutPlanBuilderResponse }>(
    'delete',
    `/workout-exercises/${exerciseRowId}`,
  )
  return data.data
}

export async function fetchExerciseLibrary(search?: string) {
  const result = await fetchExercises({ page: 1, pageSize: 150, search })
  return result.items.map((item) => ({
    id: Number(item.id),
    name: item.name,
    difficulty: item.difficulty,
    category: item.category,
  })).filter((item) => Number.isInteger(item.id) && item.id > 0)
}
