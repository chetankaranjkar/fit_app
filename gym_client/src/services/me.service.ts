import { api } from '../lib/api'

export type MeProfile = {
  userId: number
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  profilePictureUrl?: string | null
  registrationDate: string
  preferredGymTime?: string | null
}

export type MeMembership = {
  id: number
  planId: number
  planName: string
  startDate: string
  endDate: string
  status: string
  daysRemaining: number
  isExpiringSoon: boolean
  price?: number | null
  durationDays?: number | null
}

export type MeAttendanceSummary = {
  totalThisMonth: number
  totalThisWeek: number
  currentStreakDays: number
  lastVisitUtc?: string | null
  last30Days: { date: string; visited: boolean }[]
}

export type MeBodyMetric = {
  loggedAt: string
  weight?: number | null
  height?: number | null
  bodyFatPercent?: number | null
  muscleMass?: number | null
  bmi?: number | null
}

export type MeUpcomingSchedule = {
  id: number
  title: string
  dayOfWeek?: string | null
  startTime?: string | null
  endTime?: string | null
  trainerName?: string | null
}

export type MeNotification = {
  id: number
  title: string
  message: string
  createdAt: string
  isRead: boolean
}

export type MeDashboard = {
  profile: MeProfile
  membership?: MeMembership | null
  attendance: MeAttendanceSummary
  latestBodyMetric?: MeBodyMetric | null
  upcomingSchedule: MeUpcomingSchedule[]
  recentNotifications: MeNotification[]
}

export type MeDietPlan = {
  assignmentId: number
  dietPlanId: number
  planName: string
  goalType: string
  calories: number
  proteinGrams?: number | null
  carbsGrams?: number | null
  fatsGrams?: number | null
  description?: string | null
  startDate: string
  endDate?: string | null
  meals: {
    id: number
    mealName: string
    mealOrder: number
    items: {
      id: number
      foodName: string
      quantity: string
      calories?: number | null
    }[]
  }[]
}

export const meService = {
  getDashboard: () => api.get<MeDashboard>('/me/dashboard'),
  getProfile: () => api.get<MeProfile>('/me/profile'),
  getWorkoutPlans: () => api.get<unknown[]>('/me/workout-plans'),
  getDietPlan: () => api.get<MeDietPlan>('/me/diet-plan'),
}
