export const ACTIVE_MEMBERSHIP_CONFLICT_CODE = 'ACTIVE_MEMBERSHIP_EXISTS'

import type { MembershipStatus } from './userMembership'

export interface ActiveMembershipConflict {
  message: string
  membershipId: number
  userId: number
  planName?: string | null
  existingStatus?: MembershipStatus | null
  startDate: string
  endDate: string
  remainingDays: number
}
