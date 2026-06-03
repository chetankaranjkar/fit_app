import { api } from '../lib/api'
import type { User, CreateUserDto, PagedUsersResponse, UpdateUserDto } from '../types/user'
import type { MobileNumberAvailability } from '../types/mobileAvailability'
import type { UsernameAvailability } from '../types/usernameAvailability'
import { parseMobileAvailability, parseUsernameAvailability } from '../lib/parseAvailability'
import { PHONE_MESSAGES } from '../lib/phone'
import type { UserDetailDto, CreateUserDetailDto } from '../types/userDetail'

export const usersService = {
  getAll: () => api.get<User[]>('/Users'),
  getPaged: (params: {
    page: number
    pageSize: number
    search?: string
    membersOnly?: boolean
    isActive?: boolean
  }) => {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))
    if (params.search?.trim()) query.set('search', params.search.trim())
    if (params.membersOnly) query.set('membersOnly', 'true')
    if (typeof params.isActive === 'boolean') query.set('isActive', String(params.isActive))
    return api.get<PagedUsersResponse>(`/Users/paged?${query.toString()}`)
  },
  getById: (id: number) => api.get<User>(`/Users/${id}`),
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
  update: (id: number, data: UpdateUserDto) => api.put<User>(`/Users/${id}`, data),
  delete: (id: number) => api.delete(`/Users/${id}`),
  getDetails: (userId: number) => api.get<UserDetailDto[]>(`/Users/${userId}/details`),
  addDetail: (data: CreateUserDetailDto) => api.post<UserDetailDto>('/Users/details', data),
}
