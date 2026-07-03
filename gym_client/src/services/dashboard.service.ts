import { api } from '../lib/api'

export type DashboardAlert = {
  type: string
  severity: 'info' | 'warning' | 'danger' | string
  title: string
  message: string
  count: number
}

export type DashboardNotifications = {
  alerts: DashboardAlert[]
  hooks: {
    emailEnabled: boolean
    smtpEmailConfigured: boolean
    whatsAppEnabled: boolean
    scheduledRemindersEnabled: boolean
    inAppExpiryRemindersEnabled: boolean
    membershipExpiryReminderDays: number
    inAppMembershipExpiryReminderDays: number
  }
}

export type DashboardStatistics = {
  totalUsers: number
  totalTrainers: number
  trainersWithUserCount: {
    trainerId: number
    trainerName: string
    trainerEmail: string
    userCount: number
  }[]
}

export type DashboardSummary = {
  totalMembers: number
  activeMembers: number
  expiredMemberships: number
  todayAttendance: number
  pendingPayments: number
  monthlyRevenue: number
  todayRevenue: number
  trainerCount: number
  newMembersToday: number
  expiringMembershipsNext14Days: number
}

export const dashboardService = {
  getSummary: () => api.get<DashboardSummary>('/Dashboard/summary'),
  getNotifications: () => api.get<DashboardNotifications>('/Dashboard/notifications'),
  getStatistics: () => api.get<DashboardStatistics>('/Dashboard/statistics'),
}

