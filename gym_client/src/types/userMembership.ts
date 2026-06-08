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
}

export interface PagedExpiringMembershipQueueResponse {
  items: ExpiringMembershipQueueItem[]
  totalCount: number
  page: number
  pageSize: number
}
