import { api } from '../lib/api'
import type {
  DuplicatePaymentCheck,
  EnterpriseBillingDashboard,
  MembershipFinancialSummary,
  MembershipPaymentDashboard,
  MembershipPaymentDetail,
  MembershipPaymentMethod,
  MembershipPaymentTransactionRow,
  MembershipPaymentTransactionStatus,
  MemberLedger,
  BillingReport,
  RecordInstallmentPayload,
} from '../types/membershipPayment'

export const membershipPaymentsService = {
  dashboard: () => api.get<MembershipPaymentDashboard>('/membership-payments/dashboard-summary'),
  enterpriseDashboard: () =>
    api.get<EnterpriseBillingDashboard>('/membership-payments/enterprise-dashboard'),
  financialSummary: (membershipId: number) =>
    api.get<MembershipFinancialSummary>(
      `/membership-payments/financial-summary/by-membership/${membershipId}`,
    ),
  byMembership: (membershipId: number) =>
    api.get<MembershipPaymentDetail>(`/membership-payments/by-membership/${membershipId}`),
  byUser: (userId: number) => api.get<MembershipPaymentDetail[]>(`/membership-payments/by-user/${userId}`),
  memberLedger: (userId: number) => api.get<MemberLedger>(`/membership-payments/member-ledger/${userId}`),
  listTransactions: (params: {
    fromDate?: string
    toDate?: string
    status?: MembershipPaymentTransactionStatus
    userId?: number
    method?: MembershipPaymentMethod
  }) =>
    api.get<MembershipPaymentTransactionRow[]>('/membership-payments/transactions', { params }),
  checkDuplicate: (membershipPaymentId: number, amount: number) =>
    api.get<DuplicatePaymentCheck>(`/membership-payments/${membershipPaymentId}/check-duplicate`, {
      params: { amount },
    }),
  addInstallment: (id: number, body: RecordInstallmentPayload) =>
    api.post<MembershipPaymentDetail>(`/membership-payments/${id}/installments`, body),
  voidTransaction: (transactionId: number, voidReason: string) =>
    api.post<MembershipPaymentDetail>(`/membership-payments/transactions/${transactionId}/void`, {
      voidReason,
    }),
  refundTransaction: (transactionId: number, body: { refundAmount: number; refundReason: string }) =>
    api.post<MembershipPaymentDetail>(`/membership-payments/transactions/${transactionId}/refund`, body),
  applyCoupon: (id: number, couponCode: string) =>
    api.post<MembershipPaymentDetail>(`/membership-payments/${id}/apply-coupon`, { couponCode }),
  removeCoupon: (id: number) =>
    api.post<MembershipPaymentDetail>(`/membership-payments/${id}/remove-coupon`),
  invoicePdf: (id: number) =>
    api.get<Blob>(`/membership-payments/${id}/invoice-pdf`, { responseType: 'blob' }),
  report: (reportType: string, fromDate: string, toDate: string) =>
    api.get<BillingReport>(`/membership-payments/reports/${reportType}`, {
      params: { fromDate, toDate },
    }),
  auditLogs: (params?: { membershipPaymentId?: number; userId?: number; take?: number }) =>
    api.get('/membership-payments/audit-logs', { params }),
}
