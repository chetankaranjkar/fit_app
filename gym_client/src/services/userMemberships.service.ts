import { api } from '../lib/api'
import type {
  UserMembership,
  CreateUserMembershipDto,
  UpdateUserMembershipDto,
} from '../types/userMembership'

export const userMembershipsService = {
  getAll: () => api.get<UserMembership[]>('/UserMemberships'),
  getByUserId: (userId: number) =>
    api.get<UserMembership[]>(`/UserMemberships/by-user/${userId}`),
  getById: (id: number) => api.get<UserMembership>(`/UserMemberships/${id}`),
  create: (data: CreateUserMembershipDto) =>
    api.post<UserMembership>('/UserMemberships', data),
  update: (id: number, data: UpdateUserMembershipDto) =>
    api.put<UserMembership>(`/UserMemberships/${id}`, data),
  delete: (id: number) => api.delete(`/UserMemberships/${id}`),
}
