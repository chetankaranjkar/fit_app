import { api } from '../lib/api'
import type { CreatePersonalWorkoutPlanDto } from '../types/personalWorkoutPlan'
import type { SaveProgramStructureDto, WorkoutPlan } from '../types/workoutPlan'

const path = '/personal-workout-plans'

export const personalWorkoutPlansService = {
  listMine: () => api.get<WorkoutPlan[]>(`${path}/mine`),
  getMine: (id: number) => api.get<WorkoutPlan>(`${path}/mine/${id}`),
  createMine: (data: CreatePersonalWorkoutPlanDto) => api.post<WorkoutPlan>(`${path}/mine`, data),
  saveStructure: (id: number, data: SaveProgramStructureDto) =>
    api.put<WorkoutPlan>(`${path}/mine/${id}/structure`, data),
  deleteMine: (id: number) => api.delete(`${path}/mine/${id}`),
}
