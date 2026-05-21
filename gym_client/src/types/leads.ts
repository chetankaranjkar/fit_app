/** Mirrors backend <c>LeadPipelineStatus</c> (JSON string enums). */
export type LeadPipelineStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'FOLLOWUP'
  | 'TRIAL'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'CONVERTED'

export type GymLeadSummary = {
  id: number
  fullName: string
  phone?: string | null
  email?: string | null
  status: LeadPipelineStatus
  leadSource?: string | null
  customLeadSource?: string | null
  nextFollowUpAt?: string | null
  createdDate: string
  convertedMemberId?: number | null
}

export type LeadFollowup = {
  id: number
  gymLeadId: number
  notes: string
  nextFollowUpAt?: string | null
  callRemarks?: string | null
  createdByUserId?: number | null
  createdDate: string
}

export type LeadTrial = {
  id: number
  gymLeadId: number
  trialDate: string
  assignedTrainerId: number
  assignedTrainerName?: string | null
  feedback?: string | null
  conversionProbability?: number | null
  createdDate: string
}

export type GymLeadDetail = GymLeadSummary & {
  gender: string
  age?: number | null
  occupation?: string | null
  fitnessGoal?: string | null
  referenceName?: string | null
  notes?: string | null
  convertedAtUtc?: string | null
  organizationId?: number | null
  followups: LeadFollowup[]
  trials: LeadTrial[]
}

export type CreateGymLeadDto = {
  fullName: string
  phone?: string | null
  email?: string | null
  gender: string
  age?: number | null
  occupation?: string | null
  fitnessGoal?: string | null
  /** Required. Canonical code (e.g. FACEBOOK, GOOGLE_SEARCH, OTHER). */
  leadSource?: string | null
  /** Required when leadSource is OTHER. */
  customLeadSource?: string | null
  referenceName?: string | null
  notes?: string | null
  organizationId?: number | null
}

export type ReceptionDashboard = {
  todaysLeads: number
  todaysAdmissions: number
  pendingFollowUps: number
  activeMembers: number
  expiringMemberships: number
}

export type LeadAnalytics = {
  year: number
  month: number
  newLeadsInMonth: number
  admissionsInMonth: number
  conversionRatePercent: number
  /** Raw distinct sources (legacy). */
  leadSources: { source: string; count: number }[]
  /** Chart buckets: Facebook, Instagram, Google, Walk-in, Other. */
  groupedLeadSources: { source: string; count: number }[]
  /** Breakdown for the "Other" bucket. */
  otherSourceDetails: { source: string; count: number }[]
  trainerStats: {
    trainerId: number
    trainerName: string
    assignedTrials: number
    convertedLeadsTouched: number
  }[]
}

export type LeadKanbanColumn = {
  status: LeadPipelineStatus
  leads: GymLeadSummary[]
}

export type LeadKanban = {
  columns: LeadKanbanColumn[]
}

export type MembershipPlanOption = {
  id: number
  planName: string
  durationDays: number
  price: number
}

export type LeadTrainerOption = {
  id: number
  name: string
}
