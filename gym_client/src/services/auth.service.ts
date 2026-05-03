import { api } from '../lib/api'
import type {
  AuthPermission,
  CompromisedSession,
  LoginCredentials,
  LoginResponse,
} from '../types/auth'
import { Role } from '../types/auth'

const AUTH_KEYS = {
  token: 'token',
  user: 'user',
  sessionExpiredMessage: 'sessionExpiredMessage',
} as const

const AUTH_PERMISSION_CODES = {
  reports: 'Reports',
  config: 'Config',
  payments: 'Payments',
  trainerAccess: 'TrainerAccess',
} as const

function normalizeLoginResponse(raw: Record<string, unknown>): LoginResponse {
  const permissionsRaw = (raw.permissions ?? raw.Permissions) as unknown
  const permissions = Array.isArray(permissionsRaw)
    ? (permissionsRaw as Array<Record<string, unknown>>)
        .map((p) => ({
          id: typeof p.id === 'number' ? p.id : (p.Id as number | undefined),
          code: String(p.code ?? p.Code ?? ''),
          name: typeof (p.name ?? p.Name) === 'string' ? String(p.name ?? p.Name) : undefined,
          description:
            typeof (p.description ?? p.Description) === 'string'
              ? String(p.description ?? p.Description)
              : undefined,
        }))
        .filter((p) => p.code.trim().length > 0)
    : undefined

  const rolesRaw = (raw.roles ?? raw.Roles) as unknown
  const appRoles = Array.isArray(rolesRaw)
    ? (rolesRaw as Array<Record<string, unknown>>)
        .map((r) => String(r.name ?? r.Name ?? '').trim())
        .filter((n) => n.length > 0)
    : undefined

  return {
    token: String(raw.token ?? raw.Token ?? ''),
    refreshToken: (raw.refreshToken ?? raw.RefreshToken) as string | undefined,
    refreshTokenExpiresAt: (raw.refreshTokenExpiresAt ?? raw.RefreshTokenExpiresAt) as
      | string
      | undefined,
    username: String(raw.username ?? raw.Username ?? ''),
    email: String(raw.email ?? raw.Email ?? ''),
    fullName: String(raw.fullName ?? raw.FullName ?? ''),
    role: (raw.role ?? raw.Role) as LoginResponse['role'],
    userId: (raw.userId ?? raw.UserId) as number | undefined,
    trainerId: (raw.trainerId ?? raw.TrainerId) as number | undefined,
    adminId: (raw.adminId ?? raw.AdminId) as number | undefined,
    permissions,
    appRoles,
  }
}

function getStoredUserRaw() {
  const raw = localStorage.getItem(AUTH_KEYS.user)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Auth API: matches backend AuthController */
export const authService = {
  permissionCodes: AUTH_PERMISSION_CODES,
  login: (credentials: LoginCredentials) =>
    api.post<LoginResponse>('/Auth/login', credentials),
  refresh: (refreshToken: string) =>
    api.post<LoginResponse>('/Auth/refresh', { refreshToken }),
  logout: () => api.post('/Auth/logout'),
  getCompromisedSessions: () => api.get<CompromisedSession[]>('/Auth/compromised-sessions'),
  normalizeLoginResponse,
  storeSession: (response: LoginResponse | Record<string, unknown>) => {
    const normalized =
      'token' in response && typeof response.token === 'string'
        ? (response as LoginResponse)
        : normalizeLoginResponse(response as Record<string, unknown>)
    localStorage.setItem(AUTH_KEYS.token, normalized.token)
    localStorage.setItem(AUTH_KEYS.user, JSON.stringify(normalized))
  },
  clearSession: () => {
    localStorage.removeItem(AUTH_KEYS.token)
    localStorage.removeItem(AUTH_KEYS.user)
  },
  getAccessToken: () => localStorage.getItem(AUTH_KEYS.token),
  getCurrentUser: () => {
    const raw = getStoredUserRaw()
    if (!raw) return null
    return normalizeLoginResponse(raw)
  },
  getPermissions: (): AuthPermission[] => authService.getCurrentUser()?.permissions ?? [],
  hasPermission: (permissionCode: string) => {
    const normalized = permissionCode.trim().toLowerCase()
    if (!normalized) return false
    return authService
      .getPermissions()
      .some((p) => typeof p.code === 'string' && p.code.trim().toLowerCase() === normalized)
  },
  canReportsAccess: () => authService.hasPermission(AUTH_PERMISSION_CODES.reports),
  canConfigAccess: () => authService.hasPermission(AUTH_PERMISSION_CODES.config),
  canPaymentsAccess: () => authService.hasPermission(AUTH_PERMISSION_CODES.payments),
  canTrainerAccess: () => authService.hasPermission(AUTH_PERMISSION_CODES.trainerAccess),
  hasAppRole: (roleName: string) => {
    const n = roleName.trim().toUpperCase()
    if (!n) return false
    const u = authService.getCurrentUser()
    if (!u) return false
    if (u.appRoles?.some((r) => r.toUpperCase() === n)) return true
    if (n !== 'ADMIN') return false
    return u.role === Role.Admin || u.role === 'Admin' || u.role === 'ADMIN'
  },
  /** ADMIN or STAFF (JWT Roles claims) can manage venue QR & branch entry settings. */
  hasQrOwnerAccess: (): boolean =>
    authService.hasAppRole('ADMIN') || authService.hasAppRole('STAFF'),
  getRefreshToken: () => {
    const user = getStoredUserRaw()
    const token = user?.refreshToken ?? user?.RefreshToken
    return typeof token === 'string' && token.trim() ? token : null
  },
  setSessionExpiredMessage: (message: string) => {
    sessionStorage.setItem(AUTH_KEYS.sessionExpiredMessage, message)
  },
  popSessionExpiredMessage: () => {
    const msg = sessionStorage.getItem(AUTH_KEYS.sessionExpiredMessage)
    if (msg) sessionStorage.removeItem(AUTH_KEYS.sessionExpiredMessage)
    return msg
  },
}
