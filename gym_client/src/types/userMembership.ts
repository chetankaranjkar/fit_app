export type MembershipStatus =
  | 'Active'
  | 'Expired'
  | 'Paused'
  | 'Frozen'
  | 'Cancelled'
  | 'Pending'
  | 'ActivePendingPayment'
  | 'PartialPayment'
  | 'VoidPending'
  | 'Voided'
  | 'Transferred'

export interface UserMembership {
  id: number
  userId: number
  planId: number
  startDate: string
  endDate: string
  status: MembershipStatus
  userName?: string | null
  planName?: string | null
  memberPhone?: string | null
  daysRemaining?: number
  isExpired?: boolean
  membershipPaymentId?: number | null
  pendingAmount?: number
  paymentStatus?: string | null
  isFullyPaid?: boolean
  hasCompletedPayments?: boolean
}

export interface UserMembershipSummary {
  total: number
  active: number
  paymentDue: number
  expiring14d: number
  voidPending: number
  expired: number
}

export interface CreateUserMembershipDto {
  userId: number
  planId: number
  startDate: string
  endDate: string
  status?: MembershipStatus
  /** Audit: where the membership was created (e.g. members_list_modal). */
  creationSource?: string | null
  /** create | renew — renew logs MembershipAuditAction.Renewed on the server. */
  intent?: 'create' | 'renew' | null
  priorMembershipId?: number | null
}

export interface UpdateUserMembershipDto {
  planId?: number | null
  startDate?: string | null
  endDate?: string | null
  status?: MembershipStatus | null
}

export interface LastRenewalRevertPreview {
  membershipId: number
  currentPlanId: number
  currentPlanName?: string | null
  currentEndDate: string
  previousPlanId: number
  previousPlanName?: string | null
  previousStartDate: string
  previousEndDate: string
  previousStatus: string
  lastRenewedAt: string
  lastRenewedByName?: string | null
}

export interface PagedUserMembershipsResponse {
  items: UserMembership[]
  totalCount: number
  page: number
  pageSize: number
}

/** GET /api/UserMemberships/expiring-queue */
export interface ExpiringMembershipQueueItem {
  id: number
  userId: number
  planId: number
  startDate: string
  endDate: string
  status: MembershipStatus
  userName?: string | null
  memberPhone?: string | null
  planName?: string | null
  daysRemaining: number
  isExpired: boolean
  membershipPaymentId?: number | null
  pendingAmount: number
  paymentStatus?: string | null
  isFullyPaid: boolean
}

export interface PagedExpiringMembershipQueueResponse {
  items: ExpiringMembershipQueueItem[]
  totalCount: number
  page: number
  pageSize: number
}
