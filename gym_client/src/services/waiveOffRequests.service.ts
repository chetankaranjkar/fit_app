import { api } from '../lib/api'

export type WaiveOffStatus = 'Pending' | 'Approved' | 'Rejected'

export interface WaiveOffRequest {
  id: number
  userId: number
  memberName?: string | null
  memberPhotoUrl?: string | null
  membershipPaymentId: number
  planName?: string | null
  membershipFee: number
  couponDiscount: number
  approvedWaiveOffTotal: number
  requestedAmount: number
  reason: string
  status: WaiveOffStatus
  requestedByName?: string | null
  requestedDate: string
}

export const waiveOffRequestsService = {
  list: (status?: 'Pending' | 'Approved' | 'Rejected' | 'All') =>
    api.get<WaiveOffRequest[]>('/waive-off-requests', { params: status && status !== 'All' ? { status } : {} }),
  get: (id: number) => api.get<WaiveOffRequest>(`/waive-off-requests/${id}`),
  create: (body: { membershipPaymentId: number; requestedAmount: number; reason: string }) =>
    api.post<WaiveOffRequest>('/waive-off-requests', body),
  approve: (id: number) => api.post<WaiveOffRequest>(`/waive-off-requests/${id}/approve`),
  reject: (id: number, rejectionReason?: string) =>
    api.post<WaiveOffRequest>(`/waive-off-requests/${id}/reject`, { rejectionReason }),
}
