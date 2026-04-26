import { api } from '../lib/api'
import type { User, CreateUserDto, UpdateUserDto } from '../types/user'
import type { UserDetailDto, CreateUserDetailDto } from '../types/userDetail'

export const usersService = {
  getAll: () => api.get<User[]>('/Users'),
  getById: (id: number) => api.get<User>(`/Users/${id}`),
  create: (data: CreateUserDto) => api.post<User>('/Users', data),
  update: (id: number, data: UpdateUserDto) => api.put<User>(`/Users/${id}`, data),
  delete: (id: number) => api.delete(`/Users/${id}`),
  getDetails: (userId: number) => api.get<UserDetailDto[]>(`/Users/${userId}/details`),
  addDetail: (data: CreateUserDetailDto) => api.post<UserDetailDto>('/Users/details', data),
}
