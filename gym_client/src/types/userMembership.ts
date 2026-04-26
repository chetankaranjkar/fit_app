export type MembershipStatus = 'Active' | 'Expired' | 'Paused'

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
  startDate?: string | null
  endDate?: string | null
  status?: MembershipStatus | null
}
