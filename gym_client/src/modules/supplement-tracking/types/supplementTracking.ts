export const SUPPLEMENT_CATEGORIES = [
  'Protein',
  'Performance',
  'Recovery',
  'Vitamins',
  'Health',
  'Other',
] as const

export type SupplementCategory = (typeof SUPPLEMENT_CATEGORIES)[number]

export const SUPPLEMENT_TIMINGS = [
  { value: 'Morning', label: 'Morning' },
  { value: 'BeforeWorkout', label: 'Before Workout' },
  { value: 'DuringWorkout', label: 'During Workout' },
  { value: 'AfterWorkout', label: 'After Workout' },
  { value: 'BeforeBed', label: 'Before Bed' },
] as const

export const MEMBER_SUPPLEMENT_STATUSES = ['Active', 'Completed', 'Cancelled', 'Expired'] as const
export type MemberSupplementStatus = (typeof MEMBER_SUPPLEMENT_STATUSES)[number]

export interface SupplementMaster {
  id: number
  name: string
  category: string
  description?: string | null
  defaultDosage?: string | null
  isActive: boolean
  productId?: number | null
  productName?: string | null
  productSku?: string | null
}

export interface UpsertSupplementMasterPayload {
  name: string
  category: string
  description?: string | null
  defaultDosage?: string | null
  isActive: boolean
  productId?: number | null
}

export interface MemberSupplement {
  id: number
  userId: number
  memberName?: string | null
  supplementMasterId: number
  supplementName: string
  category: string
  dosage: string
  timing: string
  timingLabel: string
  startDate: string
  endDate?: string | null
  notes?: string | null
  assignedByUserId?: number | null
  assignedByName?: string | null
  status: MemberSupplementStatus
  isCurrentlyActive: boolean
  productId?: number | null
  productName?: string | null
  instructions?: string | null
  daysRemaining?: number | null
  compliancePercent?: number | null
}

export interface CreateMemberSupplementPayload {
  userId: number
  supplementMasterId: number
  dosage: string
  timing: string
  startDate: string
  endDate?: string | null
  notes?: string | null
  productId?: number | null
}

export interface UpdateMemberSupplementPayload {
  dosage: string
  timing: string
  startDate: string
  endDate?: string | null
  notes?: string | null
  status: MemberSupplementStatus
  productId?: number | null
}

export interface SupplementAnalytics {
  mostAssigned: {
    supplementMasterId: number
    name: string
    category: string
    assignmentCount: number
    activeCount: number
  }[]
  activeSupplementUsers: number
  totalActiveAssignments: number
  categoryUsage: {
    category: string
    activeAssignments: number
    totalAssignments: number
  }[]
}
