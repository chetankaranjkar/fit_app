/** Matches System.Text.Json enum serialization (PascalCase names). */
export type MembershipPaymentStatus = 'Pending' | 'Partial' | 'Paid' | 'Overdue'

export type MembershipPaymentTransactionStatus = 'Completed' | 'Voided' | 'Refunded'

export type MembershipPaymentMethod = 'Cash' | 'Upi' | 'Card' | 'BankTransfer' | 'Online' | 'Other'

export interface MembershipPaymentTransaction {
  id: number
  receiptNumber?: string
  transactionAmount: number
  transactionMethod: MembershipPaymentMethod
  status?: MembershipPaymentTransactionStatus
  referenceNumber?: string | null
  transactionDate: string
  remarks?: string | null
  collectedByUserId?: number | null
  collectedByName?: string | null
  voidReason?: string | null
  voidedByName?: string | null
  voidedDate?: string | null
  refundAmount?: number | null
  refundReason?: string | null
  refundedByName?: string | null
  refundedDate?: string | null
  createdDate?: string
}

export interface MembershipFinancialSummary {
  membershipFee: number
  couponDiscount: number
  approvedWaiveOff: number
  netPayableAmount: number
  totalPaid: number
  outstandingBalance: number
  isFullyPaid?: boolean
  isOverdue?: boolean
  planName?: string | null
  userId?: number
  memberName?: string | null
  memberPhotoUrl?: string | null
  memberCode?: string | null
}

export interface MembershipPaymentTransactionRow {
  id: number
  paymentId: number
  userId: number
  memberName?: string | null
  memberPhotoUrl?: string | null
  receiptNumber: string
  transactionAmount: number
  transactionMethod: MembershipPaymentMethod
  status: MembershipPaymentTransactionStatus
  transactionDate: string
  referenceNumber?: string | null
  remarks?: string | null
  collectedByName?: string | null
  planName?: string | null
}

export interface DuplicatePaymentCheck {
  isDuplicate: boolean
  message?: string | null
  existingTransactionId?: number | null
}

export interface EnterpriseBillingDashboard {
  totalMembershipRevenue: number
  totalPaymentsReceived: number
  outstandingDues: number
  totalCouponDiscounts: number
  totalApprovedWaiveOff: number
  pendingWaiveOffRequests: number
  voidedPaymentsCount: number
  refundedPaymentsCount: number
  monthlyCollections: number
  dailyCollections: number
  topDefaulters: { userId: number; memberName: string; outstandingBalance: number; profilePictureUrl?: string | null; planName?: string | null }[]
  pendingPaymentsCount: number
  totalPendingAmount: number
  overdueMembersCount: number
  todayCollections: number
}

export interface MembershipPaymentDetail {
  id: number
  paymentNumber: string
  userId: number
  membershipId: number
  invoiceNumber?: string | null
  invoiceId?: number | null
  totalAmount: number
  originalAmount?: number
  finalBillAmount?: number
  paidAmount: number
  pendingAmount: number
  discountAmount: number
  waiverAmount: number
  netPayableAmount?: number
  isFullyPaid?: boolean
  isPartiallyPaid?: boolean
  paymentStatus: MembershipPaymentStatus
  lastPaymentMethod?: MembershipPaymentMethod | null
  paymentDate?: string | null
  nextDueDate?: string | null
  notes?: string | null
  membershipStatus: string
  planName?: string | null
  couponId?: number | null
  couponCode?: string | null
  couponDiscountType?: string | null
  couponDiscountValue?: number | null
  couponDiscountAmount?: number
  couponLocked?: boolean
  couponAppliedAt?: string | null
  installmentCount?: number
  transactions: MembershipPaymentTransaction[]
  timeline?: MembershipBillingTimelineEvent[]
}

export interface MembershipBillingTimelineEvent {
  eventType: string
  occurredAt: string
  amount?: number | null
  couponCode?: string | null
  discountAmount?: number | null
  label?: string | null
}

export interface RecordInstallmentPayload {
  amount: number
  method: MembershipPaymentMethod
  referenceNumber?: string | null
  transactionDate: string
  nextDueDate?: string | null
  remarks?: string | null
  discountAmount?: number | null
  couponCode?: string | null
}

export interface MembershipPaymentDashboard {
  pendingPaymentsCount: number
  totalPendingAmount: number
  overdueMembersCount: number
  todayCollections: number
  upcomingDueCount: number
  partialMembersCount: number
}

export interface BillingReportLine {
  date: string
  receiptNumber?: string | null
  memberName?: string | null
  amount: number
  method?: string | null
  status?: string | null
  notes?: string | null
}

export interface BillingReport {
  reportType: string
  fromDate: string
  toDate: string
  totalAmount: number
  recordCount: number
  lines: BillingReportLine[]
}

export interface MemberLedgerPeriod {
  membershipPaymentId: number
  planName?: string | null
  membershipFee: number
  couponDiscount: number
  approvedWaiveOff: number
  netPayable: number
  totalPaid: number
  outstandingBalance: number
  payments: MembershipPaymentTransaction[]
}

export interface MemberLedger {
  userId: number
  memberName: string
  profilePictureUrl?: string | null
  periods: MemberLedgerPeriod[]
}

export interface PendingMembershipPaymentRedirect {
  userId: number
  membershipId: number
  membershipPlanId: number
  membershipAmount: number
  membershipDurationDays: number
  startDate: string
  endDate: string
  membershipPaymentId: number
}
