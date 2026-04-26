import { api } from '../lib/api'
import type {
  Payment,
  CreatePaymentDto,
  UpdatePaymentDto,
} from '../types/payment'

export const paymentsService = {
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
