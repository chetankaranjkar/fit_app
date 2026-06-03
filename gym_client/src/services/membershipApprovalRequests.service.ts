import { api } from '../lib/api'
import type {
  CreateMembershipApprovalRequestDto,
  MembershipApprovalRequest,
  MembershipApprovalStatusFilter,
} from '../types/membershipLifecycle'

export const membershipApprovalRequestsService = {
  list: (status?: MembershipApprovalStatusFilter, search?: string) =>
    api.get<MembershipApprovalRequest[]>('/membership-requests', {
      params: {
        ...(status && status !== 'All' ? { status } : {}),
        ...(search?.trim() ? { search: search.trim() } : {}),
      },
    }),
  get: (id: number) => api.get<MembershipApprovalRequest>(`/membership-requests/${id}`),
  create: (body: CreateMembershipApprovalRequestDto) =>
    api.post<MembershipApprovalRequest>('/membership-requests', body),
  approve: (id: number, adminRemarks?: string) =>
    api.post<MembershipApprovalRequest>(`/membership-requests/${id}/approve`, {
      adminRemarks: adminRemarks ?? null,
    }),
  reject: (id: number, adminRemarks?: string) =>
    api.post<MembershipApprovalRequest>(`/membership-requests/${id}/reject`, {
      adminRemarks: adminRemarks ?? null,
    }),
}
