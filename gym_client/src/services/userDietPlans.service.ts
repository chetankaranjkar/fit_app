import { api } from '../lib/api'
import { normalizeUserDietPlan } from '../lib/userDietPlanUtils'
import type { UserDietPlanDto, CreateUserDietPlanDto } from '../types/dietPlan'

function normalizeList(raw: unknown): UserDietPlanDto[] {
  const list = Array.isArray(raw) ? raw : []
  return list.map((row) => normalizeUserDietPlan(row as Record<string, unknown>))
}

export const userDietPlansService = {
  getAssignments: async (params?: { userId?: number; dietPlanId?: number }) => {
    const { data } = await api.get<unknown>('/UserDietPlans', { params })
    return { data: normalizeList(data) }
  },
  getById: async (id: number) => {
    const { data } = await api.get<unknown>(`/UserDietPlans/${id}`)
    return { data: normalizeUserDietPlan((data ?? {}) as Record<string, unknown>) }
  },
  assign: (data: CreateUserDietPlanDto) =>
    api.post<UserDietPlanDto>('/UserDietPlans', data),
  unassign: (id: number) => api.delete(`/UserDietPlans/${id}`),
}
