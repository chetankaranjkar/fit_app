import { api } from '../lib/api'
import type { UserTypeDto, CreateUserTypeDto, UpdateUserTypeDto } from '../types/userType'

export const userTypesService = {
  getAll: () => api.get<UserTypeDto[]>('/UserTypes'),
  getById: (id: number) => api.get<UserTypeDto>(`/UserTypes/${id}`),
  create: (dto: CreateUserTypeDto) => api.post<UserTypeDto>('/UserTypes', dto),
  update: (id: number, dto: UpdateUserTypeDto) => api.put<UserTypeDto>(`/UserTypes/${id}`, dto),
  delete: (id: number) => api.delete(`/UserTypes/${id}`),
}
