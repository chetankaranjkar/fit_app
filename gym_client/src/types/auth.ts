/** Matches backend Role enum (GymManagement.Domain.Entities.Role) */
export const Role = {
  User: 1,
  Instructor: 2,
  Admin: 3,
} as const

export type RoleValue = (typeof Role)[keyof typeof Role]

export interface AuthPermission {
  id?: number
  code: string
  name?: string
  description?: string
}

/** Login with username or email; no role selection. */
export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken?: string
  refreshTokenExpiresAt?: string
  username: string
  email: string
  /** API may return number (1,2,3) or string ("User","Instructor","Admin") */
  role: RoleValue | string
  userId?: number
  trainerId?: number
  adminId?: number
  fullName: string
  permissions?: AuthPermission[]
  /** App role names from <c>Roles</c> (e.g. ADMIN, MEMBER). */
  appRoles?: string[]
}

export interface CompromisedSession {
  authUserId: number
  userId?: number | null
  email: string
  fullName: string
  compromisedAt: string
  lastLoginTime?: string | null
  lastLoginIpAddress?: string | null
}

/** Public Firebase web config from GET /Auth/firebase-config */
export interface FirebasePublicConfig {
  enabled: boolean
  apiKey?: string
  authDomain?: string
  projectId?: string
  appId?: string
  messagingSenderId?: string
}
