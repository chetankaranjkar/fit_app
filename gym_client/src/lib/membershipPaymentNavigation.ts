import type { MembershipStatus, UserMembership } from '../types/userMembership'

export function collectPaymentPath(membershipId: number, userId: number): string {
  return `/dashboard/payments/collect?membershipId=${membershipId}&userId=${userId}`
}

export function membershipStatusOpensCollectPayment(status: MembershipStatus): boolean {
  return (
    status === 'ActivePendingPayment' || status === 'PartialPayment' || status === 'Expired'
  )
}

export function getMembershipCollectPaymentPath(m: Pick<UserMembership, 'id' | 'userId' | 'status'>): string | null {
  if (!membershipStatusOpensCollectPayment(m.status)) return null
  if (m.id <= 0 || m.userId <= 0) return null
  return collectPaymentPath(m.id, m.userId)
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
