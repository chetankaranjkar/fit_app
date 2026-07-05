import { getSafeDashboardReturnPath } from './safeReturnPath'
import type { ActiveMembershipConflict } from '../types/activeMembershipConflict'
import type { MembershipStatus, UserMembership } from '../types/userMembership'

export function memberProfilePath(userId: number): string {
  return `/dashboard/users/${userId}`
}

export function memberMembershipHistoryPath(userId: number): string {
  return `/dashboard/users/${userId}?mode=view&tab=membership-history`
}

export function collectPaymentPath(
  membershipId: number,
  userId: number,
  returnTo?: string | null,
): string {
  const params = new URLSearchParams({
    membershipId: String(membershipId),
    userId: String(userId),
  })
  const safeReturn = getSafeDashboardReturnPath(returnTo) ?? (userId > 0 ? memberProfilePath(userId) : null)
  if (safeReturn) params.set('returnTo', safeReturn)
  return `/dashboard/payments/collect?${params.toString()}`
}

/** Where to land after a successful collect-payment confirmation. */
export function resolvePostCollectPaymentPath(
  userId: number,
  returnToRaw: string | null | undefined,
): string | null {
  const safe = getSafeDashboardReturnPath(returnToRaw)
  if (safe) return safe
  if (userId > 0) return memberProfilePath(userId)
  return null
}

export function membershipStatusOpensCollectPayment(status: MembershipStatus): boolean {
  return (
    status === 'ActivePendingPayment' || status === 'PartialPayment' || status === 'Expired'
  )
}

export function conflictNeedsCollectPayment(
  conflict: Pick<ActiveMembershipConflict, 'existingStatus'>,
): boolean {
  return (
    conflict.existingStatus != null &&
    membershipStatusOpensCollectPayment(conflict.existingStatus)
  )
}

export function conflictCollectPaymentPath(
  conflict: ActiveMembershipConflict,
  returnTo?: string | null,
): string {
  return collectPaymentPath(conflict.membershipId, conflict.userId, returnTo)
}

export function getMembershipCollectPaymentPath(
  m: Pick<UserMembership, 'id' | 'userId' | 'status'>,
  returnTo?: string | null,
): string | null {
  if (!membershipStatusOpensCollectPayment(m.status)) return null
  if (m.id <= 0 || m.userId <= 0) return null
  return collectPaymentPath(m.id, m.userId, returnTo ?? memberProfilePath(m.userId))
}

export function membershipStatusClickTitle(status: MembershipStatus): string | undefined {
  switch (status) {
    case 'PartialPayment':
      return 'Collect remaining amount'
    case 'ActivePendingPayment':
      return 'Open payment collection'
    case 'Expired':
      return 'Collect renewal payment'
    default:
      return undefined
  }
}
