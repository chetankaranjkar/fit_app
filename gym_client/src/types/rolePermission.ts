export interface Permission {
  id: number
  code: string
  name: string
  description?: string | null
}

export interface AppRole {
  id: number
  name: string
  description?: string | null
  isActive: boolean
  permissionIds: number[]
}

export interface CreateAppRoleDto {
  name: string
  description?: string | null
  isActive: boolean
  permissionIds: number[]
}

export interface UpdateAppRoleDto {
  name?: string | null
  description?: string | null
  isActive?: boolean | null
  permissionIds?: number[] | null
}
