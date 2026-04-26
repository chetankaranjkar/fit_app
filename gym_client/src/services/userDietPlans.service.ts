import { api } from '../lib/api'
import type { UserDietPlanDto, CreateUserDietPlanDto } from '../types/dietPlan'

export const userDietPlansService = {
  getAssignments: (params?: { userId?: number; dietPlanId?: number }) =>
    api.get<UserDietPlanDto[]>('/UserDietPlans', { params }),
  getById: (id: number) => api.get<UserDietPlanDto>(`/UserDietPlans/${id}`),
  assign: (data: CreateUserDietPlanDto) =>
    api.post<UserDietPlanDto>('/UserDietPlans', data),
  unassign: (id: number) => api.delete(`/UserDietPlans/${id}`),
}
