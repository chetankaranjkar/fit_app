import type { UserDietPlanDto } from '../types/dietPlan'

/** Normalize API row (camelCase or PascalCase). */
export function normalizeUserDietPlan(raw: Record<string, unknown>): UserDietPlanDto {
  const isActiveRaw = raw.isActive ?? raw.IsActive
  return {
    id: Number(raw.id ?? raw.Id),
    userId: Number(raw.userId ?? raw.UserId),
    dietPlanId: Number(raw.dietPlanId ?? raw.DietPlanId),
    userName: (raw.userName ?? raw.UserName) as string | null | undefined,
    dietPlanName: (raw.dietPlanName ?? raw.DietPlanName) as string | null | undefined,
    assignedByTrainerId: (raw.assignedByTrainerId ?? raw.AssignedByTrainerId) as number | null | undefined,
    startDate: String(raw.startDate ?? raw.StartDate ?? ''),
    endDate: (raw.endDate ?? raw.EndDate ?? null) as string | null | undefined,
    isActive: isActiveRaw === undefined ? true : Boolean(isActiveRaw),
    notes: (raw.notes ?? raw.Notes) as string | null | undefined,
  }
}

/** True when member has a diet assignment that counts as "onboarded" (matches member app rules). */
export function memberHasDietAssignment(assignments: UserDietPlanDto[]): boolean {
  if (assignments.length === 0) return false
  const today = new Date().toISOString().slice(0, 10)
  return assignments.some((a) => {
    if (a.isActive === false) return false
    const start = a.startDate?.slice(0, 10) ?? ''
    if (start && start > today) return false
    const end = a.endDate?.slice(0, 10)
    if (end && end < today) return false
    return true
  })
}

export function primaryDietAssignment(assignments: UserDietPlanDto[]): UserDietPlanDto | null {
  const today = new Date().toISOString().slice(0, 10)
  const sorted = [...assignments].sort((a, b) => b.startDate.localeCompare(a.startDate))
  return (
    sorted.find((a) => {
      if (a.isActive === false) return false
      const start = a.startDate?.slice(0, 10) ?? ''
      if (start && start > today) return false
      const end = a.endDate?.slice(0, 10)
      if (end && end < today) return false
      return true
    }) ??
    sorted[0] ??
    null
  )
}
