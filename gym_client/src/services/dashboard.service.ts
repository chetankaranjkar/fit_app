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
    whatsAppEnabled: boolean
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

export const dashboardService = {
  getNotifications: () => api.get<DashboardNotifications>('/Dashboard/notifications'),
  getStatistics: () => api.get<DashboardStatistics>('/Dashboard/statistics'),
}

