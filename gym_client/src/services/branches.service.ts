import { api } from '../lib/api'
import type { BranchCrudDto, BranchCreatePayload, BranchUpdatePayload, OrganizationOptionDto } from '../types/branch'
import type { BranchQrAccessPutDto } from '../types/qr'

export const branchesService = {
  list: (opts?: { activeOnly?: boolean }) =>
    api.get<BranchCrudDto[]>('/branches', {
      params: opts?.activeOnly === true ? { activeOnly: true } : undefined,
    }),

  organizationOptions: () => api.get<OrganizationOptionDto[]>('/branches/lookup/organizations'),

  getById: (id: number) => api.get<BranchCrudDto>(`/branches/${id}`),

  create: (body: BranchCreatePayload) => api.post<BranchCrudDto>('/branches', body),

  update: (id: number, body: BranchUpdatePayload) => api.put<BranchCrudDto>(`/branches/${id}`, body),

  /** Soft deactivate (sets IsActive=false on the server). */
  deactivate: (id: number) => api.delete(`/branches/${id}`),

  deactivationPreview: (id: number) =>
    api.get<{
      activeMembers: number
      homeUsers: number
      staffAssignments: number
      occupiedLockers: number
      equipmentAssets: number
      stockOnHand: number
      openBookings: number
      outstandingBills: number
      canDeactivateWithoutPolicy: boolean
    }>(`/branches/${id}/deactivation-preview`),

  close: (id: number, handlingPolicy: string) =>
    api.post(`/branches/${id}/close`, { handlingPolicy }),

  transferMember: (body: {
    userId: number
    toBranchId: number
    effectiveDate: string
    reason: string
    accessDecision: string
    financialDecision: string
    selectedBranchIds?: number[]
  }) => api.post('/branch-operations/transfers', body),

  updateQrAccess: (branchId: number, body: BranchQrAccessPutDto) =>
    api.put(`/branches/${branchId}/qr-access`, body),

  planOffers: (branchId: number) =>
    api.get<Array<{ planId: number; planName: string; durationDays: number; price: number }>>(
      '/branch-operations/plan-offers',
      { params: { branchId } },
    ),

  planPrices: (planId: number) =>
    api.get<PlanBranchPriceSetting[]>('/branch-operations/plan-prices', { params: { planId } }),

  savePlanPrice: (body: { planId: number; branchId: number; price: number; isAvailable: boolean }) =>
    api.put('/branch-operations/plan-prices', body),
}

export type PlanBranchPriceSetting = {
  branchId: number
  branchName: string
  branchActive: boolean
  price?: number | null
  isAvailable: boolean
  isConfigured: boolean
}
