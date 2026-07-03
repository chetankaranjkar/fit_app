export interface UserInstructorAssignment {
  id: number
  userId: number
  userName: string
  trainerId: number
  trainerName: string
  assignmentDate: string
  endDate?: string | null
  isActive: boolean
  notes?: string | null
}

export interface UpdateUserInstructorAssignmentDto {
  endDate?: string | null
  isActive?: boolean | null
  notes?: string | null
}

export interface TrainerAssignmentRecommendation {
  trainerId: number
  trainerName: string
  availabilityStatus: string
  activeClients: number
  maxActiveClients: number
  remainingCapacity: number
  conflictCount: number
  isRecommended: boolean
  warnings: string[]
}
