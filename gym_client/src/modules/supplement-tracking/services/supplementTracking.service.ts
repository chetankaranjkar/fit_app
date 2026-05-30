import { api } from '../../../lib/api'
import type {
  CreateMemberSupplementPayload,
  MemberSupplement,
  SupplementAnalytics,
  SupplementMaster,
  UpdateMemberSupplementPayload,
  UpsertSupplementMasterPayload,
} from '../types/supplementTracking'

export const supplementTrackingService = {
  listMaster(activeOnly = true) {
    return api.get<SupplementMaster[]>('/SupplementMaster', { params: { activeOnly } })
  },

  getMaster(id: number) {
    return api.get<SupplementMaster>(`/SupplementMaster/${id}`)
  },

  createMaster(payload: UpsertSupplementMasterPayload) {
    return api.post<SupplementMaster>('/SupplementMaster', payload)
  },

  updateMaster(id: number, payload: UpsertSupplementMasterPayload) {
    return api.put<SupplementMaster>(`/SupplementMaster/${id}`, payload)
  },

  deleteMaster(id: number) {
    return api.delete(`/SupplementMaster/${id}`)
  },

  getMine(activeOnly = true) {
    return api.get<MemberSupplement[]>('/MemberSupplements/me', { params: { activeOnly } })
  },

  getByUser(userId: number, activeOnly = true) {
    return api.get<MemberSupplement[]>(`/MemberSupplements/user/${userId}`, { params: { activeOnly } })
  },

  getHistoryByUser(userId: number) {
    return api.get<MemberSupplement[]>(`/MemberSupplements/user/${userId}/history`)
  },

  assign(payload: CreateMemberSupplementPayload) {
    return api.post<MemberSupplement>('/MemberSupplements', payload)
  },

  updateAssignment(id: number, payload: UpdateMemberSupplementPayload) {
    return api.put<MemberSupplement>(`/MemberSupplements/${id}`, payload)
  },

  getAnalytics() {
    return api.get<SupplementAnalytics>('/MemberSupplements/analytics')
  },
}
