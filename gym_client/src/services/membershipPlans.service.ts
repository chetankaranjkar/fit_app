import { api } from '../lib/api'
import type {
  MembershipPlan,
  CreateMembershipPlanDto,
  UpdateMembershipPlanDto,
} from '../types/membershipPlan'

export const membershipPlansService = {
  getAll: () => api.get<MembershipPlan[]>('/MembershipPlans'),
  getById: (id: number) => api.get<MembershipPlan>(`/MembershipPlans/${id}`),
  create: (data: CreateMembershipPlanDto) =>
    api.post<MembershipPlan>('/MembershipPlans', data),
  update: (id: number, data: UpdateMembershipPlanDto) =>
    api.put<MembershipPlan>(`/MembershipPlans/${id}`, data),
  delete: (id: number) => api.delete(`/MembershipPlans/${id}`),
}
