import { getSafeDashboardReturnPath } from './safeReturnPath'
import { COLLECT_OUTSTANDING_LABEL, deriveMembershipStanding } from './membershipStanding'
import type { ActiveMembershipConflict } from '../types/activeMembershipConflict'
import type { MembershipStatus, UserMembership } from '../types/userMembership'

export function memberProfilePath(userId: number): string {
  return `/dashboard/users/${userId}`
}

export function memberMembershipHistoryPath(userId: number): string {
  return `/dashboard/users/${userId}?mode=view&tab=billing`
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

/** Collect path only when the membership has an outstanding balance and its billing is open. */
export function getMembershipCollectPaymentPath(
  m: Pick<UserMembership, 'id' | 'userId' | 'status' | 'pendingAmount' | 'paymentStatus' | 'membershipPaymentId'>,
  returnTo?: string | null,
): string | null {
  if (m.id <= 0 || m.userId <= 0) return null
  const hasBillingRecord = m.membershipPaymentId != null || m.paymentStatus != null
  const outstanding = hasBillingRecord ? (m.pendingAmount ?? 0) : null
  const rule = deriveMembershipStanding({ status: m.status, outstanding, billingStatus: m.paymentStatus }).collect
  if (!rule.allowed) return null
  return collectPaymentPath(m.id, m.userId, returnTo ?? memberProfilePath(m.userId))
}

export function membershipStatusClickTitle(status: MembershipStatus): string | undefined {
  return membershipStatusOpensCollectPayment(status) ? COLLECT_OUTSTANDING_LABEL : undefined
}
