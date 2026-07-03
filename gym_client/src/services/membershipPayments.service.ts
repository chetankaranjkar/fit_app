import { api } from '../lib/api'
import type { GymBranding } from '../types/gymBranding'
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
  SendPaymentReceiptResult,
} from '../types/membershipPayment'

export type TransactionListParams = {
  fromDate?: string
  toDate?: string
  status?: MembershipPaymentTransactionStatus | '' | 'All' | 'all'
  userId?: number
  method?: MembershipPaymentMethod | '' | 'All' | 'all'
}

/** Omit blank / "All" filters so the API does not receive invalid enum query values. */
export function buildTransactionListParams(params: TransactionListParams) {
  const query: Record<string, string | number> = {}
  const from = params.fromDate?.trim()
  const to = params.toDate?.trim()
  if (from) query.fromDate = from
  if (to) query.toDate = to

  const status = params.status?.trim()
  if (status && status.toLowerCase() !== 'all') query.status = status

  const method = params.method?.trim()
  if (method && method.toLowerCase() !== 'all') query.method = method

  const uid = params.userId
  if (typeof uid === 'number' && Number.isInteger(uid) && uid > 0) query.userId = uid

  return query
}

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
  listTransactions: (params: TransactionListParams = {}) =>
    api.get<MembershipPaymentTransactionRow[]>('/membership-payments/transactions', {
      params: buildTransactionListParams(params),
    }),
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
  receiptPdf: (transactionId: number) =>
    api.get<Blob>(`/membership-payments/transactions/${transactionId}/receipt-pdf`, {
      responseType: 'blob',
    }),
  receiptBranding: async () => {
    const { data } = await api.get<Record<string, unknown>>('/membership-payments/receipt-branding')
    return {
      gymName: String(data.gymName ?? data.GymName ?? 'Gym Management'),
      gymLogoUrl: (data.gymLogoUrl ?? data.GymLogoUrl ?? null) as string | null,
      invoiceLogoUrl: (data.invoiceLogoUrl ?? data.InvoiceLogoUrl ?? null) as string | null,
    } satisfies GymBranding
  },
  report: (reportType: string, fromDate: string, toDate: string) =>
    api.get<BillingReport>(`/membership-payments/reports/${reportType}`, {
      params: { fromDate, toDate },
    }),
  auditLogs: (params?: { membershipPaymentId?: number; userId?: number; take?: number }) =>
    api.get('/membership-payments/audit-logs', { params }),
  sendReceipt: (transactionId: number, channel: 'email' | 'sms' | 'both') =>
    api.post<SendPaymentReceiptResult>(`/membership-payments/transactions/${transactionId}/send-receipt`, {
      channel,
    }),
  sendDueReminder: (membershipPaymentId: number, channel: 'email' | 'sms' | 'both') =>
    api.post<SendPaymentReceiptResult>(`/membership-payments/${membershipPaymentId}/send-due-reminder`, {
      channel,
    }),
}
