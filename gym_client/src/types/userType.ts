export interface UserTypeDto {
  id: number
  name: string
  description?: string | null
}

export interface CreateUserTypeDto {
  name: string
  description?: string | null
}

export interface UpdateUserTypeDto {
  name?: string | null
  description?: string | null
}
