import { api } from '../lib/api'
import type { Permission, AppRole, CreateAppRoleDto, UpdateAppRoleDto } from '../types/rolePermission'
import type { PagedUserRoleAssignments } from '../types/userRoleAssignment'

function normalizeUserRoleAssignment(raw: Record<string, unknown>): PagedUserRoleAssignments['items'][number] {
  const appRolesRaw = raw.appRoles ?? raw.AppRoles
  const appRoles = Array.isArray(appRolesRaw)
    ? appRolesRaw.map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: Number(row.id ?? row.Id ?? 0),
          name: String(row.name ?? row.Name ?? ''),
          description: (row.description ?? row.Description) as string | null | undefined,
          isActive: Boolean(row.isActive ?? row.IsActive ?? true),
          permissionIds: (row.permissionIds ?? row.PermissionIds ?? []) as number[],
        }
      })
    : []
  return {
    userId: Number(raw.userId ?? raw.UserId ?? 0),
    firstName: String(raw.firstName ?? raw.FirstName ?? ''),
    lastName: String(raw.lastName ?? raw.LastName ?? ''),
    email: (raw.email ?? raw.Email) as string | null | undefined,
    username: (raw.username ?? raw.Username) as string | null | undefined,
    isActive: Boolean(raw.isActive ?? raw.IsActive ?? true),
    appRoles,
  }
}

export const rolesService = {
  getPermissions: () => api.get<Permission[]>('/Roles/permissions'),
  getRoles: () => api.get<AppRole[]>('/Roles'),
  getRoleById: (id: number) => api.get<AppRole>(`/Roles/${id}`),
  createRole: (data: CreateAppRoleDto) => api.post<AppRole>('/Roles', data),
  updateRole: (id: number, data: UpdateAppRoleDto) => api.put<AppRole>(`/Roles/${id}`, data),
  deleteRole: (id: number) => api.delete(`/Roles/${id}`),
  getUserAssignments: (params: { page: number; pageSize: number; search?: string }) => {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))
    if (params.search?.trim()) query.set('search', params.search.trim())
    return api.get<PagedUserRoleAssignments>(`/Roles/user-assignments?${query.toString()}`)
  },
  getUserAppRoles: (userId: number) => api.get<AppRole[]>(`/Roles/users/${userId}/app-roles`),
  assignUserRole: (userId: number, roleCode: string) =>
    api.post(`/Roles/users/${userId}/roles`, { roleCode }),
  revokeUserRole: (userId: number, roleCode: string) =>
    api.delete(`/Roles/users/${userId}/roles/${encodeURIComponent(roleCode)}`),
  normalizeUserRoleAssignment,
}
