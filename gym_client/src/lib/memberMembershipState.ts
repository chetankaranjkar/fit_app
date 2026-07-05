import { findOccupyingMembershipConflict } from './membershipRules'
import type { UserMembership } from '../types/userMembership'

export type MemberMembershipModalState =
  | 'no_membership'
  | 'has_active'
  | 'expired_history_only'
  | 'inactive_history_only'

export type MemberMembershipStateResult = {
  state: MemberMembershipModalState
  occupyingMembership?: UserMembership
  latestExpired?: UserMembership
  canAddMembership: boolean
  canRenewMembership: boolean
}

function byEndDateDesc(a: UserMembership, b: UserMembership) {
  return new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
}

export function deriveMemberMembershipModalState(
  memberships: UserMembership[],
  userId: number,
): MemberMembershipStateResult {
  if (memberships.length === 0) {
    return {
      state: 'no_membership',
      canAddMembership: true,
      canRenewMembership: false,
    }
  }

  const occupyingMembership = findOccupyingMembershipConflict(memberships, userId)
  if (occupyingMembership) {
    return {
      state: 'has_active',
      occupyingMembership,
      canAddMembership: false,
      canRenewMembership: true,
    }
  }

  const expiredRows = memberships.filter((m) => m.status === 'Expired').sort(byEndDateDesc)
  const latestExpired = expiredRows[0]

  if (latestExpired) {
    return {
      state: 'expired_history_only',
      latestExpired,
      canAddMembership: true,
      canRenewMembership: true,
    }
  }

  return {
    state: 'inactive_history_only',
    canAddMembership: true,
    canRenewMembership: false,
  }
}

export function formatMembershipDisplayDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}
