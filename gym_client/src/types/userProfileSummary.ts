export interface UserProfileSummary {
  latestWeightKg: number | null
  latestHeightCm: number | null
  bmi: number | null
  streak: number
  visitsThisMonth: number
  totalVisits: number
  hasActiveMembership: boolean
  hasWorkoutAssignment: boolean
  hasDietAssignment: boolean
  hasAnyDietAssignment: boolean
  primaryDietPlanName: string | null
  /** In-flight membership (Active, pending payment, partial, frozen, pending, void pending) that has not ended. */
  currentMembershipId?: number | null
  currentMembershipStatus?: string | null
  currentMembershipPlanName?: string | null
  currentMembershipEndDate?: string | null
  /** End date of the most recent lapsed membership when there is no current one. */
  lapsedMembershipEndDate?: string | null
  hasOpenBalance?: boolean
  isPaymentOverdue?: boolean
  openMembershipId?: number | null
}
