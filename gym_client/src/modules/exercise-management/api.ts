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
    // Fallback to existing ASP.NET exercises endpoint so premium UI works
    // even when the Node premium API is not running locally.
    const { data } = await coreApi.get<LegacyExercise[]>('/Exercises')
    const list = (Array.isArray(data) ? data : []).map(mapLegacyExercise)
    const q = params.search?.trim().toLowerCase() ?? ''
    const filtered = list.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.muscleGroupPrimary ?? '').toLowerCase().includes(q)
      const matchesCategory = !params.category || item.category === params.category
      const matchesDifficulty = !params.difficulty || item.difficulty === params.difficulty
      const matchesEquipment =
        !params.equipment ||
        (item.equipment ?? '').toLowerCase().includes(params.equipment.toLowerCase())
      return matchesSearch && matchesCategory && matchesDifficulty && matchesEquipment
    })
    const start = (params.page - 1) * params.pageSize
    const pageItems = filtered.slice(start, start + params.pageSize)
    return {
      items: pageItems,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        totalCount: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / params.pageSize)),
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
