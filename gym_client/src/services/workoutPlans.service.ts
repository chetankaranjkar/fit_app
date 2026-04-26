import { api } from '../lib/api'
import type { CreateWorkoutPlanDto, WorkoutPlan } from '../types/workoutPlan'

export const workoutPlansService = {
  getAll: () => api.get<WorkoutPlan[]>('/WorkoutPlans'),
  getById: (id: number) => api.get<WorkoutPlan>(`/WorkoutPlans/${id}`),
  create: (data: CreateWorkoutPlanDto) => api.post<WorkoutPlan>('/WorkoutPlans', data),
  update: (id: number, data: CreateWorkoutPlanDto) => api.put<WorkoutPlan>(`/WorkoutPlans/${id}`, data),
  delete: (id: number) => api.delete(`/WorkoutPlans/${id}`),
}
