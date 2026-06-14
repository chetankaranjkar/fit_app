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
}
