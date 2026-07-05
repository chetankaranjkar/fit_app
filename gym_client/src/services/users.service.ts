import { api } from '../lib/api'
import type { User, CreateUserDto, PagedUsersResponse, UpdateUserDto } from '../types/user'
import type { MobileNumberAvailability } from '../types/mobileAvailability'
import type { UsernameAvailability } from '../types/usernameAvailability'
import { parseMobileAvailability, parseUsernameAvailability } from '../lib/parseAvailability'
import { PHONE_MESSAGES } from '../lib/phone'
import type { UserDetailDto, CreateUserDetailDto } from '../types/userDetail'
import type { UserProfileSummary } from '../types/userProfileSummary'

export type MembersDirectoryStats = {
  total: number
  active: number
  inactive: number
  batches: { batch: string; count: number }[]
}

export const usersService = {
  getAll: (params?: { assignedToCoachOnly?: boolean }) => {
    const query = new URLSearchParams()
    if (params?.assignedToCoachOnly) query.set('assignedToCoachOnly', 'true')
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return api.get<User[]>(`/Users${suffix}`)
  },
  getPaged: (
    params: {
      page: number
      pageSize: number
      search?: string
      membersOnly?: boolean
      isActive?: boolean
      /** Morning, Afternoon, Evening, or Night */
      preferredGymTime?: string
      /** Skip payment summary joins for faster typeahead search. */
      includeBilling?: boolean
      /** Limit to members assigned to the signed-in coach (trainer persona / coach-only access). */
      assignedToCoachOnly?: boolean
      /** Count only — skips row hydration (faster KPI queries). */
      countOnly?: boolean
    },
    options?: { signal?: AbortSignal },
  ) => {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))
    if (params.search?.trim()) query.set('search', params.search.trim())
    if (params.membersOnly) query.set('membersOnly', 'true')
    if (typeof params.isActive === 'boolean') query.set('isActive', String(params.isActive))
    if (params.preferredGymTime?.trim()) query.set('preferredGymTime', params.preferredGymTime.trim())
    if (params.includeBilling === false) query.set('includeBilling', 'false')
    if (params.assignedToCoachOnly) query.set('assignedToCoachOnly', 'true')
    if (params.countOnly) query.set('countOnly', 'true')
    return api.get<PagedUsersResponse>(`/Users/paged?${query.toString()}`, { signal: options?.signal })
  },
  getMembersDirectoryCount: (params?: {
    isActive?: boolean
    preferredGymTime?: string
    assignedToCoachOnly?: boolean
  }) => {
    const query = new URLSearchParams()
    if (typeof params?.isActive === 'boolean') query.set('isActive', String(params.isActive))
    if (params?.preferredGymTime?.trim()) query.set('preferredGymTime', params.preferredGymTime.trim())
    if (params?.assignedToCoachOnly) query.set('assignedToCoachOnly', 'true')
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return api.get<number>(`/Users/members-directory-count${suffix}`)
  },
  getMembersDirectoryStats: (params?: { assignedToCoachOnly?: boolean }) => {
    const query = new URLSearchParams()
    if (params?.assignedToCoachOnly) query.set('assignedToCoachOnly', 'true')
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return api.get<MembersDirectoryStats>(`/Users/members-directory-stats${suffix}`)
  },
  getById: (id: number) => api.get<User>(`/Users/${id}`),
  getProfileSummary: (id: number) => api.get<UserProfileSummary>(`/Users/${id}/profile-summary`),
  checkMobileAvailability: async (mobile: string, excludeUserId?: number): Promise<MobileNumberAvailability> => {
    const query = new URLSearchParams()
    query.set('mobile', mobile.trim())
    if (excludeUserId != null && excludeUserId > 0) query.set('excludeUserId', String(excludeUserId))
    try {
      const { data } = await api.get(`/Users/check-mobile?${query.toString()}`)
      return parseMobileAvailability(data)
    } catch {
      return usersService.checkMobileAvailabilityFallback(mobile, excludeUserId)
    }
  },
  /** Uses paged user search when dedicated check-mobile endpoint is unavailable. */
  checkMobileAvailabilityFallback: async (
    mobile: string,
    excludeUserId?: number,
  ): Promise<MobileNumberAvailability> => {
    const { data: page } = await usersService.getPaged({
      page: 1,
      pageSize: 25,
      search: mobile.trim(),
    })
    const owner = page.items.find(
      (u) => u.phone === mobile.trim() && (excludeUserId == null || u.id !== excludeUserId),
    )
    if (!owner) {
      return { isAvailable: true, normalizedMobileNumber: mobile.trim() }
    }
    return {
      isAvailable: false,
      normalizedMobileNumber: mobile.trim(),
      validationError: PHONE_MESSAGES.duplicate,
      existingUserId: owner.id,
      existingUserName: `${owner.firstName} ${owner.lastName}`.trim() || 'User',
    }
  },
  checkUsernameAvailability: async (username: string, excludeUserId?: number): Promise<UsernameAvailability> => {
    const query = new URLSearchParams()
    query.set('username', username.trim())
    if (excludeUserId != null && excludeUserId > 0) query.set('excludeUserId', String(excludeUserId))
    try {
      const { data } = await api.get(`/Users/check-username?${query.toString()}`)
      return parseUsernameAvailability(data)
    } catch {
      return usersService.checkUsernameAvailabilityFallback(username, excludeUserId)
    }
  },
  checkUsernameAvailabilityFallback: async (
    username: string,
    excludeUserId?: number,
  ): Promise<UsernameAvailability> => {
    const trimmed = username.trim()
    const lower = trimmed.toLowerCase()
    const { data: page } = await usersService.getPaged({
      page: 1,
      pageSize: 25,
      search: trimmed,
    })
    const owner = page.items.find((u) => {
      if (excludeUserId != null && u.id === excludeUserId) return false
      const login = (u.username ?? '').trim().toLowerCase()
      if (!login) return false
      if (lower.includes('@')) return login === lower
      return login === lower || login.startsWith(`${lower}@`)
    })
    if (!owner) return { isAvailable: true }
    return {
      isAvailable: false,
      validationError: 'This username is already in use.',
      existingUserId: owner.id,
      existingUserName: `${owner.firstName} ${owner.lastName}`.trim() || owner.username || 'User',
    }
  },
  create: (data: CreateUserDto) => api.post<User>('/Users', data),
  bulkImportMembers: (members: CreateUserDto[], options?: { timeoutMs?: number }) =>
    api.post<{ imported: number; log: string[] }>(
      '/Users/bulk-import',
      { members },
      options?.timeoutMs != null ? { timeout: options.timeoutMs } : undefined,
    ),
  update: (id: number, data: UpdateUserDto) => api.put<User>(`/Users/${id}`, data),
  updateNotificationPreferences: (
    id: number,
    data: { receiveEmailNotifications: boolean; receiveSmsNotifications: boolean },
  ) =>
    api.put<{ receiveEmailNotifications: boolean; receiveSmsNotifications: boolean }>(
      `/Users/${id}/notification-preferences`,
      {
        receiveEmailNotifications: data.receiveEmailNotifications,
        receiveSmsNotifications: data.receiveSmsNotifications,
      },
    ),
  validateTrainingSchedule: (data: {
    trainerId: number
    userId?: number
    trainingScheduleType?: string
    preferredGymTime?: string
    trainingStartTime?: string | null
    trainingEndTime?: string | null
    trainingDaysOfWeek?: string
  }) => api.post('/Users/training-schedule/validate', data),
  delete: (id: number) => api.delete(`/Users/${id}`),
  getDetails: (userId: number) => api.get<UserDetailDto[]>(`/Users/${userId}/details`),
  addDetail: (data: CreateUserDetailDto) => api.post<UserDetailDto>('/Users/details', data),
}
