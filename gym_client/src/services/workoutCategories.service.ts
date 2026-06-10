import { api } from '../lib/api'
import type {
  CreateWorkoutCategoryDto,
  SaveCategoryWarmupStretchDto,
  UpdateWorkoutCategoryDto,
  WorkoutCategory,
  WorkoutCategorySummary,
} from '../types/workoutCategory'

export const workoutCategoriesService = {
  getAll: () => api.get<WorkoutCategorySummary[]>('/workout-categories'),
  getById: (id: number) => api.get<WorkoutCategory>(`/workout-categories/${id}`),
  create: (data: CreateWorkoutCategoryDto) => api.post<WorkoutCategory>('/workout-categories', data),
  update: (id: number, data: UpdateWorkoutCategoryDto) => api.put<WorkoutCategory>(`/workout-categories/${id}`, data),
  delete: (id: number) => api.delete(`/workout-categories/${id}`),
  saveWarmupStretch: (id: number, data: SaveCategoryWarmupStretchDto) =>
    api.put<WorkoutCategory>(`/workout-categories/${id}/warmup-stretch`, data),
}
