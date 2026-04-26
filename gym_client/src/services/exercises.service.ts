import { api } from '../lib/api'
import type {
  CreateExerciseDto,
  Exercise,
  PagedExercisesResponse,
  UpdateExerciseDto,
} from '../types/exercise'

export const exercisesService = {
  getAll: () => api.get<Exercise[]>('/Exercises'),
  getPaged: (params: {
    page: number
    pageSize: number
    search?: string
    difficulty?: string
    bodyPartId?: number | 'all'
    sortBy?: 'created' | 'name' | 'difficulty' | 'bodyPart'
    sortDir?: 'asc' | 'desc'
  }) => {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))
    if (params.search?.trim()) query.set('search', params.search.trim())
    if (params.difficulty && params.difficulty !== 'All') query.set('difficulty', params.difficulty)
    if (typeof params.bodyPartId === 'number' && params.bodyPartId > 0) {
      query.set('bodyPartId', String(params.bodyPartId))
    }
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortDir) query.set('sortDir', params.sortDir)
    return api.get<PagedExercisesResponse>(`/Exercises/paged?${query.toString()}`)
  },
  getById: (id: number) => api.get<Exercise>(`/Exercises/${id}`),
  create: (data: CreateExerciseDto) => api.post<Exercise>('/Exercises', data),
  update: (id: number, data: UpdateExerciseDto) => api.put<Exercise>(`/Exercises/${id}`, data),
  delete: (id: number) => api.delete(`/Exercises/${id}`),
}
