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
