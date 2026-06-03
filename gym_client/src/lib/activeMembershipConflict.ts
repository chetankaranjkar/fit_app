import type { AxiosError } from 'axios'
import type { ActiveMembershipConflict } from '../types/activeMembershipConflict'
import { ACTIVE_MEMBERSHIP_CONFLICT_CODE } from '../types/activeMembershipConflict'
import {
  findOccupyingMembershipConflict,
  occupiesMembershipSlot,
} from './membershipRules'
import type { MembershipStatus, UserMembership } from '../types/userMembership'

export function wouldAssignActiveStatus(status?: MembershipStatus): boolean {
  return (status ?? 'Active') === 'Active'
}

export function findLocalOccupyingMembershipConflict(
  memberships: UserMembership[],
  userId: number,
  excludeMembershipId?: number,
): UserMembership | undefined {
  return findOccupyingMembershipConflict(memberships, userId, excludeMembershipId)
}

/** @deprecated Use findLocalOccupyingMembershipConflict */
export function findLocalActiveMembershipConflict(
  memberships: UserMembership[],
  userId: number,
  excludeMembershipId?: number,
): UserMembership | undefined {
  return findLocalOccupyingMembershipConflict(memberships, userId, excludeMembershipId)
}

export { occupiesMembershipSlot }

export function remainingDaysFromEndDate(endDate: string): number {
  const end = new Date(endDate.slice(0, 10) + 'T12:00:00Z')
  const today = new Date()
  today.setUTCHours(12, 0, 0, 0)
  const diff = Math.ceil((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  return Math.max(0, diff)
}

export function membershipToConflict(m: UserMembership): ActiveMembershipConflict {
  return {
    message: 'Member already has an active or pending membership.',
    membershipId: m.id,
    userId: m.userId,
    planName: m.planName,
    existingStatus: m.status,
    startDate: m.startDate,
    endDate: m.endDate,
    remainingDays: remainingDaysFromEndDate(m.endDate),
  }
}

type ProblemBody = {
  code?: string
  activeMembership?: ActiveMembershipConflict
  detail?: string
  title?: string
  extensions?: {
    code?: string
    activeMembership?: ActiveMembershipConflict
  }
}

export function parseActiveMembershipConflict(error: unknown): ActiveMembershipConflict | null {
  const ax = error as AxiosError<ProblemBody>
  if (ax?.response?.status !== 409) return null
  const data = ax.response.data
  const code = data?.code ?? data?.extensions?.code
  const payload = data?.activeMembership ?? data?.extensions?.activeMembership
  const normalized = payload
    ? {
        ...payload,
        membershipId: payload.membershipId ?? (payload as { MembershipId?: number }).MembershipId ?? 0,
        userId: payload.userId ?? (payload as { UserId?: number }).UserId ?? 0,
        planName: payload.planName ?? (payload as { PlanName?: string }).PlanName,
        startDate: payload.startDate ?? (payload as { StartDate?: string }).StartDate ?? '',
        endDate: payload.endDate ?? (payload as { EndDate?: string }).EndDate ?? '',
        remainingDays: payload.remainingDays ?? (payload as { RemainingDays?: number }).RemainingDays ?? 0,
        existingStatus:
          payload.existingStatus ??
          (payload as { ExistingStatus?: MembershipStatus }).ExistingStatus,
        message:
          payload.message ??
          (payload as { Message?: string }).Message ??
          'Member already has an active or pending membership.',
      }
    : null
  if (code === ACTIVE_MEMBERSHIP_CONFLICT_CODE && normalized) return normalized
  if (normalized?.membershipId) return normalized
  const detail = data?.detail ?? ''
  if (detail.toLowerCase().includes('active membership')) {
    return {
      message: detail,
      membershipId: 0,
      userId: 0,
      remainingDays: 0,
      startDate: '',
      endDate: '',
    }
  }
  return null
}
