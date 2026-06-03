import type { MembershipStatus, UserMembership } from '../types/userMembership'



/** Statuses that block creating another membership for the same member. */

export const OCCUPYING_MEMBERSHIP_STATUSES: readonly MembershipStatus[] = [

  'Active',

  'ActivePendingPayment',

  'PartialPayment',

  'Frozen',

  'Pending',

  'VoidPending',

]



/** Only one <c>Active</c> row per member (DB unique index). */

export function requiresExclusiveActiveSlot(status: MembershipStatus | string | undefined): boolean {

  return (status ?? 'Active') === 'Active'

}



export function occupiesMembershipSlot(status: MembershipStatus | string | undefined): boolean {

  return OCCUPYING_MEMBERSHIP_STATUSES.includes(status as MembershipStatus)

}



export function findOccupyingMembershipConflict(

  memberships: UserMembership[],

  userId: number,

  excludeMembershipId?: number,

): UserMembership | undefined {

  return memberships.find(

    (m) =>

      m.userId === userId &&

      occupiesMembershipSlot(m.status) &&

      (excludeMembershipId == null || m.id !== excludeMembershipId),

  )

}



/** @deprecated Use findOccupyingMembershipConflict */

export function findActiveMembershipConflict(

  memberships: UserMembership[],

  userId: number,

  excludeMembershipId?: number,

): UserMembership | undefined {

  return findOccupyingMembershipConflict(memberships, userId, excludeMembershipId)

}


