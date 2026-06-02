import { api } from '../lib/api'
import type {
  UserMembership,
  CreateUserMembershipDto,
  PagedUserMembershipsResponse,
  UpdateUserMembershipDto,
} from '../types/userMembership'

export const userMembershipsService = {
  getAll: () => api.get<UserMembership[]>('/UserMemberships'),
  getPaged: (params: {
    page: number
    pageSize: number
    search?: string
    status?: string
  }) => {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))
    if (params.search?.trim()) query.set('search', params.search.trim())
    if (params.status && params.status !== 'all') query.set('status', params.status)
    return api.get<PagedUserMembershipsResponse>(`/UserMemberships/paged?${query.toString()}`)
  },
  getByUserId: (userId: number) =>
    api.get<UserMembership[]>(`/UserMemberships/by-user/${userId}`),
  getById: (id: number) => api.get<UserMembership>(`/UserMemberships/${id}`),
  create: (data: CreateUserMembershipDto) =>
    api.post<UserMembership>('/UserMemberships', data),
  update: (id: number, data: UpdateUserMembershipDto) =>
    api.put<UserMembership>(`/UserMemberships/${id}`, data),
  delete: (id: number) => api.delete(`/UserMemberships/${id}`),
}
