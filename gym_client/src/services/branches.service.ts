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

  updateQrAccess: (branchId: number, body: BranchQrAccessPutDto) =>
    api.put(`/branches/${branchId}/qr-access`, body),
}
