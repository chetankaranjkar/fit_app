import { api } from '../lib/api'
import type {
  MembershipPaymentDashboard,
  MembershipPaymentDetail,
  RecordInstallmentPayload,
} from '../types/membershipPayment'

export const membershipPaymentsService = {
  dashboard: () => api.get<MembershipPaymentDashboard>('/membership-payments/dashboard-summary'),
  byMembership: (membershipId: number) =>
    api.get<MembershipPaymentDetail>(`/membership-payments/by-membership/${membershipId}`),
  byUser: (userId: number) => api.get<MembershipPaymentDetail[]>(`/membership-payments/by-user/${userId}`),
  addInstallment: (id: number, body: RecordInstallmentPayload) =>
    api.post<MembershipPaymentDetail>(`/membership-payments/${id}/installments`, body),
  invoicePdf: (id: number) =>
    api.get<Blob>(`/membership-payments/${id}/invoice-pdf`, { responseType: 'blob' }),
}
