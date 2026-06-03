import type { AppRole } from './rolePermission'

export interface UserRoleAssignment {
  userId: number
  firstName: string
  lastName: string
  email?: string | null
  username?: string | null
  isActive: boolean
  appRoles: AppRole[]
}

export interface PagedUserRoleAssignments {
  items: UserRoleAssignment[]
  totalCount: number
  page: number
  pageSize: number
}
