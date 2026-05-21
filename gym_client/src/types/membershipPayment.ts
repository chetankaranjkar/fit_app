/** Matches System.Text.Json enum serialization (PascalCase names). */
export type MembershipPaymentStatus = 'Pending' | 'Partial' | 'Paid' | 'Overdue'

export type MembershipPaymentMethod = 'Cash' | 'Upi' | 'Card' | 'BankTransfer' | 'Online' | 'Other'

export interface MembershipPaymentTransaction {
  id: number
  transactionAmount: number
  transactionMethod: MembershipPaymentMethod
  referenceNumber?: string | null
  transactionDate: string
  remarks?: string | null
  collectedByUserId?: number | null
  collectedByName?: string | null
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
