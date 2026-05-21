import { api } from '../lib/api'
import type {
  CreateGymLeadDto,
  GymLeadDetail,
  GymLeadSummary,
  LeadAnalytics,
  LeadFollowup,
  LeadKanban,
  LeadPipelineStatus,
  LeadTrial,
  LeadTrainerOption,
  MembershipPlanOption,
  ReceptionDashboard,
} from '../types/leads'

export type ConvertLeadToMemberDto = {
  planId: number
  membershipStartDate?: string | null
  trainerId?: number | null
  password?: string | null
  email?: string | null
  phone?: string | null
  memberUserTypeIds?: number[] | null
}

export const leadsService = {
  getReceptionDashboard: () => api.get<ReceptionDashboard>('/Leads/reception-dashboard'),

  getAnalytics: (year: number, month: number) =>
    api.get<LeadAnalytics>('/Leads/analytics', { params: { year, month } }),

  getKanban: () => api.get<LeadKanban>('/Leads/kanban'),

  list: (status?: LeadPipelineStatus) =>
    api.get<GymLeadSummary[]>('/Leads', { params: status ? { status } : {} }),

  getById: (id: number) => api.get<GymLeadDetail>(`/Leads/${id}`),

  create: (dto: CreateGymLeadDto) => api.post<GymLeadDetail>('/Leads', dto),

  update: (id: number, dto: Partial<CreateGymLeadDto>) => api.put<GymLeadDetail>(`/Leads/${id}`, dto),

  remove: (id: number) => api.delete(`/Leads/${id}`),

  setStatus: (id: number, status: LeadPipelineStatus) =>
    api.patch<GymLeadDetail>(`/Leads/${id}/status`, { status }),

  addFollowup: (id: number, body: { notes: string; nextFollowUpAt?: string | null; callRemarks?: string | null }) =>
    api.post<LeadFollowup>(`/Leads/${id}/followups`, body),

  addTrial: (id: number, body: CreateLeadTrialBody) => api.post<LeadTrial>(`/Leads/${id}/trials`, body),

  updateTrial: (leadId: number, trialId: number, body: { feedback?: string | null; conversionProbability?: number | null }) =>
    api.patch<LeadTrial>(`/Leads/${leadId}/trials/${trialId}`, body),

  convert: (id: number, dto: ConvertLeadToMemberDto) =>
    api.post<{ lead: GymLeadDetail; member: unknown }>(`/Leads/${id}/convert`, {
      planId: dto.planId,
      membershipStartDate: dto.membershipStartDate,
      trainerId: dto.trainerId,
      password: dto.password,
      email: dto.email,
      phone: dto.phone,
      memberUserTypeIds: dto.memberUserTypeIds,
    }),

  conversionPlans: () => api.get<MembershipPlanOption[]>('/Leads/conversion/plans'),

  trainerOptions: () => api.get<LeadTrainerOption[]>('/Leads/trainer-options'),
}

type CreateLeadTrialBody = {
  trialDate: string
  assignedTrainerId: number
  feedback?: string | null
  conversionProbability?: number | null
}
