import axios from 'axios'
import { api as coreApi } from '../../lib/api'
import type { Exercise, ExerciseListResponse, ExerciseUpsertPayload } from './types'

const exerciseApi = axios.create({
  baseURL: import.meta.env.VITE_EXERCISE_API_URL?.trim() || '/exercise-api/api',
})

type LegacyExercise = {
  id: number
  name: string
  description?: string | null
  difficultyLevel?: string
  bodyPartName?: string
  equipmentRequired?: string | null
  videoUrl?: string | null
}

function mapLegacyExercise(item: LegacyExercise): Exercise {
  return {
    id: String(item.id),
    name: item.name,
    slug: null,
    category: item.bodyPartName ?? null,
    muscleGroupPrimary: item.bodyPartName ?? null,
    difficulty: item.difficultyLevel ?? null,
    description: item.description ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    forceType: null,
    mechanic: null,
    equipment: item.equipmentRequired ?? null,
    isUnilateral: false,
    isTimeBased: false,
    imageUrl: null,
    videoUrl: item.videoUrl ?? null,
  }
}

export async function fetchExercises(params: {
  page: number
  pageSize: number
  search?: string
  category?: string
  difficulty?: string
  equipment?: string
}) {
  try {
    const { data } = await exerciseApi.get<{ success: boolean; data: ExerciseListResponse }>('/exercises', {
      params,
    })
    return data.data
  } catch {
    // Fallback to ASP.NET paged endpoint (server-side) when the Node premium API is unavailable.
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))
    if (params.search?.trim()) query.set('search', params.search.trim())
    if (params.difficulty) query.set('difficulty', params.difficulty)
    if (params.category) {
      const bodyPartId = Number(params.category)
      if (Number.isFinite(bodyPartId) && bodyPartId > 0) query.set('bodyPartId', String(bodyPartId))
    }
    const { data } = await coreApi.get<{
      items: LegacyExercise[]
      totalCount: number
      page: number
      pageSize: number
    }>(`/Exercises/paged?${query.toString()}`)
    const list = (Array.isArray(data?.items) ? data.items : []).map(mapLegacyExercise)
    const equipmentFilter = params.equipment?.trim().toLowerCase()
    const filtered = equipmentFilter
      ? list.filter((item) => (item.equipment ?? '').toLowerCase().includes(equipmentFilter))
      : list
    const totalCount = equipmentFilter ? filtered.length : (data?.totalCount ?? filtered.length)
    return {
      items: filtered,
      pagination: {
        page: data?.page ?? params.page,
        pageSize: data?.pageSize ?? params.pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / (data?.pageSize ?? params.pageSize))),
      },
    }
  }
}

export async function fetchExerciseById(id: string) {
  try {
    const { data } = await exerciseApi.get<{ success: boolean; data: Exercise }>(`/exercises/${id}`)
    return data.data
  } catch {
    const numericId = Number(id)
    const { data } = await coreApi.get<LegacyExercise>(`/Exercises/${numericId}`)
    return mapLegacyExercise(data)
  }
}

export async function createExercise(payload: ExerciseUpsertPayload) {
  try {
    const { data } = await exerciseApi.post<{ success: boolean; data: Exercise }>('/exercises', payload)
    return data.data
  } catch {
    const legacyPayload = {
      name: payload.name,
      description: payload.description ?? null,
      steps: payload.description?.trim() || '1. Perform movement safely',
      videoUrl: payload.videoUrl ?? null,
      difficultyLevel: payload.difficulty ?? 'Beginner',
      equipmentRequired: payload.equipment?.join(', ') ?? null,
      bodyPartId: 1,
      exerciseSteps: [],
    }
    const { data } = await coreApi.post<LegacyExercise>('/Exercises', legacyPayload)
    return mapLegacyExercise(data)
  }
}

export async function updateExercise(id: string, payload: ExerciseUpsertPayload) {
  try {
    const { data } = await exerciseApi.put<{ success: boolean; data: Exercise }>(`/exercises/${id}`, payload)
    return data.data
  } catch {
    const numericId = Number(id)
    const legacyPayload = {
      name: payload.name,
      description: payload.description ?? null,
      steps: payload.description?.trim() || '1. Perform movement safely',
      videoUrl: payload.videoUrl ?? null,
      difficultyLevel: payload.difficulty ?? 'Beginner',
      equipmentRequired: payload.equipment?.join(', ') ?? null,
      exerciseSteps: [],
    }
    const { data } = await coreApi.put<LegacyExercise>(`/Exercises/${numericId}`, legacyPayload)
    return mapLegacyExercise(data)
  }
}

export async function deleteExercise(id: string) {
  try {
    await exerciseApi.delete(`/exercises/${id}`)
  } catch {
    await coreApi.delete(`/Exercises/${Number(id)}`)
  }
}
