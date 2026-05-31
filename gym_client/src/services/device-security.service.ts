import { api } from '../lib/api'

export interface DeviceSecurityAnalytics {
  totalActiveDevices: number
  usersWithMultipleDevices: number
  suspiciousAccounts: number
  failedLoginsToday: number
  dailyLogins: number
  platformBreakdown: { platform: string; count: number }[]
  recentDevices: AdminDeviceRow[]
}

export interface AdminDeviceRow {
  deviceId: number
  userId: number
  memberName: string
  email?: string
  deviceLabel: string
  platform?: string
  lastLoginDate?: string
  activeSessionCount: number
  failedAttempts: number
  isSuspicious: boolean
}

export async function getDeviceSecurityAnalytics(params?: {
  filter?: string
  search?: string
  page?: number
  pageSize?: number
}) {
  const { data } = await api.get<DeviceSecurityAnalytics>('/admin/device-security/analytics', {
    params,
  })
  return data
}
