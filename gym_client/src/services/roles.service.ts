import { api } from '../lib/api'
import type { Permission, AppRole, CreateAppRoleDto, UpdateAppRoleDto } from '../types/rolePermission'

export const rolesService = {
  getPermissions: () => api.get<Permission[]>('/Roles/permissions'),
  getRoles: () => api.get<AppRole[]>('/Roles'),
  getRoleById: (id: number) => api.get<AppRole>(`/Roles/${id}`),
  createRole: (data: CreateAppRoleDto) => api.post<AppRole>('/Roles', data),
  updateRole: (id: number, data: UpdateAppRoleDto) => api.put<AppRole>(`/Roles/${id}`, data),
  deleteRole: (id: number) => api.delete(`/Roles/${id}`),
}
