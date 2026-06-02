import { api } from '../lib/api'
import type { User, CreateUserDto, PagedUsersResponse, UpdateUserDto } from '../types/user'
import type { MobileNumberAvailability } from '../types/mobileAvailability'
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
  checkMobileAvailability: (mobile: string, excludeUserId?: number) => {
    const query = new URLSearchParams()
    query.set('mobile', mobile.trim())
    if (excludeUserId != null && excludeUserId > 0) query.set('excludeUserId', String(excludeUserId))
    return api.get<MobileNumberAvailability>(`/Users/check-mobile?${query.toString()}`)
  },
  create: (data: CreateUserDto) => api.post<User>('/Users', data),
  update: (id: number, data: UpdateUserDto) => api.put<User>(`/Users/${id}`, data),
  delete: (id: number) => api.delete(`/Users/${id}`),
  getDetails: (userId: number) => api.get<UserDetailDto[]>(`/Users/${userId}/details`),
  addDetail: (data: CreateUserDetailDto) => api.post<UserDetailDto>('/Users/details', data),
}
