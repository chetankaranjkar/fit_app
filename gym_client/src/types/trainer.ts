/**
 * ==========================================================================
 *  TRAINER DOMAIN TYPES  —  Gold-standard shapes for the Trainers module.
 * ==========================================================================
 *  Core Trainer + DTOs are wire-compatible with the existing .NET backend
 *  (fields added here are optional on the server — missing values just
 *  render as "—"), so this file can land without requiring the API to ship
 *  first.
 * ==========================================================================
 */

/* ---------- Enumerations ---------- */

export const AVAILABILITY_STATUSES = [
  'Available',
  'Busy',
  'On Leave',
  'Off Duty',
] as const
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number]

export const VERIFICATION_STATUSES = [
  'Unverified',
  'Pending',
  'Verified',
  'Rejected',
] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export const TRAINER_GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const
export type TrainerGender = (typeof TRAINER_GENDERS)[number]

export const WEEK_DAYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const
export type WeekDay = (typeof WEEK_DAYS)[number]

export const COMMON_SPECIALIZATIONS = [
  'Strength & Conditioning',
  'Weight Loss',
  'Yoga',
  'Pilates',
  'HIIT',
  'Cardio',
  'Bodybuilding',
  'CrossFit',
  'Powerlifting',
  'Functional Training',
  'Rehabilitation',
  'Sports Performance',
  'Nutrition Coaching',
  'Senior Fitness',
  'Kids Fitness',
  'Zumba / Dance',
] as const

export const COMMON_CERTIFICATIONS = [
  'ACE',
  'NASM-CPT',
  'ACSM',
  'ISSA',
  'NSCA-CSCS',
  'K11',
  'REPs',
  'RYT 200',
  'RYT 500',
  'Precision Nutrition',
] as const

/* ---------- Core Trainer ---------- */

/**
 * Flattened trainer record returned by `GET /Trainers` and `/Trainers/{id}`.
 * First/last/email come from the linked User; the rest from TrainerProfile.
 * New "gold standard" fields below are optional — old backends simply omit them.
 */
export interface Trainer {
  id: number
  userId: number
  /* Identity (sourced from User) */
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  gender?: TrainerGender | null
  dateOfBirth?: string | null
  /* Profile */
  employeeCode?: string | null
  specialization?: string | null
  /** Comma-separated list of extra specializations (e.g. "HIIT, Yoga"). */
  secondarySpecializations?: string | null
  bio?: string | null
  profilePicture?: string | null
  coverPhoto?: string | null
  /* Credentials */
  certifications?: string | null
  certificationDetails?: string | null
  languagesSpoken?: string | null
  /* Employment */
  hireDate: string
  joiningDate?: string | null
  experienceYears?: number | null
  isPersonalTrainer?: boolean | null
  employmentType?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Freelance' | null
  /* Commercials */
  sessionRate?: number | null
  hourlyRate?: number | null
  monthlyRate?: number | null
  currency?: string | null
  /* Capacity & schedule */
  maxClients?: number | null
  totalClients: number
  /** CSV of active days e.g. "Mon,Tue,Wed,Fri". Parsed in UI. */
  workingDays?: string | null
  /** "HH:mm" strings in 24h format. */
  workingHoursStart?: string | null
  workingHoursEnd?: string | null
  /* Performance */
  rating?: number | null
  reviewCount?: number | null
  totalSessionsConducted?: number | null
  retentionRate?: number | null
  /* Socials / contacts */
  instagramUrl?: string | null
  linkedinUrl?: string | null
  websiteUrl?: string | null
  /* Status */
  availabilityStatus?: AvailabilityStatus | string | null
  verificationStatus?: VerificationStatus | null
  terminationDate?: string | null
  terminationReason?: string | null
  isActive: boolean
}

/* ---------- Stats ---------- */

/** Trainer overview metrics (operational + performance). */
export interface TrainerStats {
  totalTrainers: number
  activeTrainers: number
  onLeave: number
  avgRating: number | null
  totalClientsAssigned: number
  /* Optional — filled by newer API versions */
  newThisMonth?: number
  totalSessionsThisMonth?: number
  avgExperienceYears?: number | null
  avgClientsPerTrainer?: number | null
  utilizationRate?: number | null
}

/* ---------- Create / Update DTOs ---------- */

export interface CreateTrainerDto {
  userId: number
  employeeCode?: string | null
  specialization?: string | null
  secondarySpecializations?: string | null
  certifications?: string | null
  certificationDetails?: string | null
  experienceYears?: number | null
  joiningDate?: string | null
  bio?: string | null
  profilePicture?: string | null
  coverPhoto?: string | null
  languagesSpoken?: string | null
  availabilityStatus?: AvailabilityStatus | string | null
  verificationStatus?: VerificationStatus | null
  isPersonalTrainer?: boolean
  employmentType?: Trainer['employmentType']
  sessionRate?: number | null
  hourlyRate?: number | null
  monthlyRate?: number | null
  currency?: string | null
  maxClients?: number | null
  workingDays?: string | null
  workingHoursStart?: string | null
  workingHoursEnd?: string | null
  instagramUrl?: string | null
  linkedinUrl?: string | null
  websiteUrl?: string | null
  gender?: TrainerGender | null
}

export interface UpdateTrainerDto {
  employeeCode?: string | null
  specialization?: string | null
  secondarySpecializations?: string | null
  certifications?: string | null
  certificationDetails?: string | null
  bio?: string | null
  profilePicture?: string | null
  coverPhoto?: string | null
  languagesSpoken?: string | null
  experienceYears?: number | null
  totalClients?: number | null
  rating?: number | null
  reviewCount?: number | null
  totalSessionsConducted?: number | null
  retentionRate?: number | null
  availabilityStatus?: AvailabilityStatus | string | null
  verificationStatus?: VerificationStatus | null
  employmentType?: Trainer['employmentType']
  sessionRate?: number | null
  hourlyRate?: number | null
  monthlyRate?: number | null
  currency?: string | null
  maxClients?: number | null
  workingDays?: string | null
  workingHoursStart?: string | null
  workingHoursEnd?: string | null
  instagramUrl?: string | null
  linkedinUrl?: string | null
  websiteUrl?: string | null
  gender?: TrainerGender | null
  terminationDate?: string | null
  terminationReason?: string | null
  isActive?: boolean | null
}

/* ---------- Reviews ---------- */

export interface TrainerReview {
  id: number
  trainerId: number
  userId: number
  userName: string
  userAvatar?: string | null
  rating: number
  comment?: string | null
  createdAt: string
}

export interface CreateTrainerReviewDto {
  trainerId: number
  userId: number
  rating: number
  comment?: string | null
}

/* ---------- Schedule / Availability ---------- */

export interface TrainerAvailabilitySlot {
  id: number
  trainerId: number
  /** 0=Sun..6=Sat or a specific date in YYYY-MM-DD. */
  dayOfWeek?: number | null
  date?: string | null
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  isBooked: boolean
  clientUserId?: number | null
  clientName?: string | null
  sessionType?: string | null
  notes?: string | null
}

export interface TrainerScheduleDay {
  date: string
  slots: TrainerAvailabilitySlot[]
}

/* ---------- Earnings / Performance ---------- */

export interface TrainerEarningsSummary {
  trainerId: number
  currency: string
  totalThisMonth: number
  totalThisYear: number
  totalAllTime: number
  sessionsThisMonth: number
  sessionsThisYear: number
  averagePerSession: number
  monthlySeries: Array<{ month: string; earnings: number; sessions: number }>
}

/* ---------- Filters (client-side) ---------- */

export interface TrainerFilters {
  search: string
  specialization: string | 'All'
  availability: AvailabilityStatus | 'All'
  activeOnly: boolean
  minRating: number | null
  minExperienceYears: number | null
  personalTrainerOnly: boolean
}

export const DEFAULT_TRAINER_FILTERS: TrainerFilters = {
  search: '',
  specialization: 'All',
  availability: 'All',
  activeOnly: false,
  minRating: null,
  minExperienceYears: null,
  personalTrainerOnly: false,
}

/* ---------- UI helpers ---------- */

export function parseCsv(csv?: string | null): string[] {
  if (!csv) return []
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function joinCsv(arr: string[]): string {
  return arr.map((s) => s.trim()).filter(Boolean).join(', ')
}

export function trainerFullName(t: Pick<Trainer, 'firstName' | 'lastName'>): string {
  return `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || '—'
}

export function trainerInitials(t: Pick<Trainer, 'firstName' | 'lastName'>): string {
  const name = trainerFullName(t)
  if (name === '—') return 'NA'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
