export interface MembershipPlan {
  id: number
  planName: string
  durationDays: number
  price: number
  description?: string | null
}

export interface CreateMembershipPlanDto {
  planName: string
  durationDays: number
  price: number
  description?: string | null
}

export interface UpdateMembershipPlanDto {
  planName?: string | null
  durationDays?: number | null
  price?: number | null
  description?: string | null
}
