import type { UserMembership } from '../types/userMembership'

export const MEMBER_ACTIVE_MEMBERSHIP_REQUIRED =
  'An active membership is required before assigning workout or diet plans.'

/** Matches backend `UserMembershipRules.AllowsWorkoutAndDietAssignment`. */
export function membershipAllowsTrainingAssignment(m: {
  status: string
  endDate?: string | null
}): boolean {
  if (m.status !== 'Active') return false
  if (!m.endDate) return true
  const end = m.endDate.slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  return end >= today
}

export function memberCanReceiveTrainingServices(options: {
  hasActiveMembership?: boolean
  memberships?: Pick<UserMembership, 'status' | 'endDate'>[]
}): boolean {
  if (options.hasActiveMembership === true) return true
  if (options.hasActiveMembership === false) return false
  return (options.memberships ?? []).some(membershipAllowsTrainingAssignment)
}
