import { api } from '../lib/api'
import type {
  AssignWorkoutPlanDto,
  CreateUserScheduleDto,
  UserScheduleDto,
} from '../types/userSchedule'

export const userSchedulesService = {
  getAll: () => api.get<UserScheduleDto[]>('/UserSchedules'),
  getByUserId: (userId: number) => api.get<UserScheduleDto[]>(`/UserSchedules/user/${userId}`),
  create: (data: CreateUserScheduleDto) => api.post<UserScheduleDto>('/UserSchedules', data),
  assignWorkoutPlan: (data: AssignWorkoutPlanDto) =>
    api.post<UserScheduleDto>('/UserSchedules/assign-workout-plan', data),
  delete: (id: number) => api.delete(`/UserSchedules/${id}`),
}
