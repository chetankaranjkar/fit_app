import { api } from '../lib/api'
import type {
  CloneWorkoutPlanDto,
  CreateWorkoutPlanDto,
  SaveProgramStructureDto,
  WorkoutPlan,
} from '../types/workoutPlan'

/** API exposes the same controller at /Programs and /WorkoutPlans. Prefer Programs naming. */
const path = '/Programs'

export const workoutPlansService = {
  getAll: () => api.get<WorkoutPlan[]>(path),
  getById: (id: number) => api.get<WorkoutPlan>(`${path}/${id}`),
  create: (data: CreateWorkoutPlanDto) => api.post<WorkoutPlan>(path, data),
  update: (id: number, data: CreateWorkoutPlanDto) => api.put<WorkoutPlan>(`${path}/${id}`, data),
  delete: (id: number) => api.delete(`${path}/${id}`),
  saveStructure: (id: number, data: SaveProgramStructureDto) =>
    api.put<WorkoutPlan>(`${path}/${id}/structure`, data),
  clone: (id: number, data?: CloneWorkoutPlanDto) =>
    api.post<WorkoutPlan>(`${path}/${id}/clone`, data ?? {}),
}

/** Alias for clearer call sites in new Programs UI. */
export const programsService = workoutPlansService
