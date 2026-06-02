import { api } from '../lib/api'
import type { ApiPagedResponse } from '../types/apiPaged'
import type {
  Payment,
  CreatePaymentDto,
  UpdatePaymentDto,
} from '../types/payment'

export const paymentsService = {
  getPaged: (params: {
    page: number
    pageSize: number
    search?: string
    fromDate?: string
    toDate?: string
    sortBy?: string
    sortDir?: 'asc' | 'desc'
  }) => {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))
    if (params.search?.trim()) query.set('search', params.search.trim())
    if (params.fromDate) query.set('fromDate', params.fromDate)
    if (params.toDate) query.set('toDate', params.toDate)
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortDir) query.set('sortDir', params.sortDir)
    return api.get<ApiPagedResponse<Payment>>(`/Payments/paged?${query.toString()}`)
  },
  getAll: () => api.get<Payment[]>('/Payments'),
  getByMembershipId: (membershipId: number) =>
    api.get<Payment[]>(`/Payments/by-membership/${membershipId}`),
  getById: (id: number) => api.get<Payment>(`/Payments/${id}`),
  ensureInvoice: (id: number) => api.post<Payment>(`/Payments/${id}/ensure-invoice`),
  create: (data: CreatePaymentDto) => api.post<Payment>('/Payments', data),
  update: (id: number, data: UpdatePaymentDto) =>
    api.put<Payment>(`/Payments/${id}`, data),
  delete: (id: number) => api.delete(`/Payments/${id}`),
}
