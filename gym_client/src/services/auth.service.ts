import { api } from '../lib/api'
import type {
  AccountAuthInfo,
  AuthPermission,
  ChangePasswordPayload,
  CompromisedSession,
  FirebasePublicConfig,
  ForgotPasswordResponse,
  LoginCredentials,
  LoginResponse,
  ResetPasswordPayload,
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
  usersAccess: 'UsersAccess',
  createUsers: 'CreateUsers',
  createMember: 'CREATE_MEMBER',
  leadsCrm: 'LEADS_CRM',
  leadsTrainer: 'LEADS_TRAINER',
  managePtPackages: 'MANAGE_PT_PACKAGES',
  bookPtSessions: 'BOOK_PT_SESSIONS',
  managePtSchedules: 'MANAGE_PT_SCHEDULES',
  viewTrainerEarnings: 'VIEW_TRAINER_EARNINGS',
  viewPtReports: 'VIEW_PT_REPORTS',
  voidPayment: 'VOID_PAYMENT',
  refundPayment: 'REFUND_PAYMENT',
  approveWaiveOff: 'APPROVE_WAIVE_OFF',
  viewFinancialAudit: 'VIEW_FINANCIAL_AUDIT',
  submitMembershipRequest: 'SUBMIT_MEMBERSHIP_REQUEST',
  approveMembershipRequest: 'APPROVE_MEMBERSHIP_REQUEST',
  viewMembershipAudit: 'VIEW_MEMBERSHIP_AUDIT',
  viewWorkoutPlanAudit: 'VIEW_WORKOUT_PLAN_AUDIT',
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

function normalizeFirebaseConfig(raw: Record<string, unknown>): FirebasePublicConfig {
  const str = (key: string) => {
    const v = raw[key] ?? raw[key.charAt(0).toUpperCase() + key.slice(1)]
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
  }
  return {
    enabled: Boolean(raw.enabled ?? raw.Enabled),
    apiKey: str('apiKey'),
    authDomain: str('authDomain'),
    projectId: str('projectId'),
    appId: str('appId'),
    messagingSenderId: str('messagingSenderId'),
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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

const JWT_ROLE_CLAIM_KEYS = [
  'role',
  'roles',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
] as const

function collectJwtRoleValues(value: unknown, out: string[]) {
  if (typeof value === 'string' && value.trim()) {
    out.push(value.trim())
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectJwtRoleValues(item, out)
  }
}

/** Application role names embedded in the access token (UserRoles → JWT role claims). */
function getJwtAppRoles(token?: string | null): string[] {
  const accessToken = token?.trim() || localStorage.getItem(AUTH_KEYS.token)
  if (!accessToken) return []
  const payload = decodeJwtPayload(accessToken)
  if (!payload) return []

  const roles: string[] = []
  for (const key of JWT_ROLE_CLAIM_KEYS) {
    collectJwtRoleValues(payload[key], roles)
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key.endsWith('/role') || key.endsWith('/roles')) {
      collectJwtRoleValues(value, roles)
    }
  }

  return [...new Set(roles.map((r) => r.toUpperCase()).filter(Boolean))]
}

function mergeAppRoleNames(...sources: Array<string[] | undefined>): string[] {
  const merged = new Set<string>()
  for (const list of sources) {
    for (const name of list ?? []) {
      const normalized = name.trim().toUpperCase()
      if (normalized) merged.add(normalized)
    }
  }
  return [...merged]
}

function notifySessionUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gym-session-updated'))
  }
}

function isAccessTokenValid(token: string | null | undefined): boolean {
  const value = token?.trim()
  if (!value) return false
  const payload = decodeJwtPayload(value)
  const exp = payload?.exp
  if (typeof exp !== 'number') return true
  return exp * 1000 > Date.now() + 30_000
}

/** Auth API: matches backend AuthController */
export const authService = {
  permissionCodes: AUTH_PERMISSION_CODES,
  login: (credentials: LoginCredentials) => {
    const id = credentials.username.trim()
    const body: { password: string; username: string; email?: string } = {
      username: id,
      password: credentials.password,
    }
    if (id.includes('@')) body.email = id
    return api.post<LoginResponse>('/Auth/login', body)
  },
  fetchFirebaseConfig: async (): Promise<FirebasePublicConfig> => {
    const { data } = await api.get<Record<string, unknown>>('/Auth/firebase-config')
    return normalizeFirebaseConfig((data ?? {}) as Record<string, unknown>)
  },
  firebaseLogin: (idToken: string) =>
    api.post<LoginResponse>('/Auth/firebase-login', { idToken }),
  refresh: (refreshToken: string) =>
    api.post<LoginResponse>('/Auth/refresh', { refreshToken }),
  logout: () => api.post('/Auth/logout'),
  getCompromisedSessions: () => api.get<CompromisedSession[]>('/Auth/compromised-sessions'),
  getAccount: async (): Promise<AccountAuthInfo> => {
    const { data } = await api.get<Record<string, unknown>>('/Auth/account')
    const raw = (data ?? {}) as Record<string, unknown>
    return {
      email: String(raw.email ?? raw.Email ?? ''),
      requiresCurrentPassword: Boolean(
        raw.requiresCurrentPassword ?? raw.RequiresCurrentPassword ?? true,
      ),
    }
  },
  changePassword: (payload: ChangePasswordPayload) =>
    api.post('/Auth/change-password', {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
      confirmPassword: payload.confirmPassword,
    }),
  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    const { data } = await api.post<Record<string, unknown>>('/Auth/forgot-password', { email })
    const raw = (data ?? {}) as Record<string, unknown>
    return {
      message: String(raw.message ?? raw.Message ?? ''),
      devResetUrl:
        typeof (raw.devResetUrl ?? raw.DevResetUrl) === 'string'
          ? String(raw.devResetUrl ?? raw.DevResetUrl)
          : undefined,
    }
  },
  resetPassword: (payload: ResetPasswordPayload) =>
    api.post('/Auth/reset-password', {
      token: payload.token,
      newPassword: payload.newPassword,
      confirmPassword: payload.confirmPassword,
    }),
  normalizeLoginResponse,
  storeSession: (response: LoginResponse | Record<string, unknown>) => {
    const normalized =
      'token' in response && typeof response.token === 'string'
        ? (response as LoginResponse)
        : normalizeLoginResponse(response as Record<string, unknown>)
    const jwtRoles = getJwtAppRoles(normalized.token)
    const appRoles = mergeAppRoleNames(
      normalized.appRoles,
      jwtRoles,
    ).map((name) => {
      const fromStored = normalized.appRoles?.find((r) => r.toUpperCase() === name)
      return fromStored ?? name
    })
    const stored: LoginResponse = { ...normalized, appRoles }
    localStorage.setItem(AUTH_KEYS.token, stored.token)
    localStorage.setItem(AUTH_KEYS.user, JSON.stringify(stored))
    notifySessionUpdated()
  },
  clearSession: () => {
    localStorage.removeItem(AUTH_KEYS.token)
    localStorage.removeItem(AUTH_KEYS.user)
  },
  getAccessToken: () => localStorage.getItem(AUTH_KEYS.token),
  isAccessTokenValid: () => isAccessTokenValid(localStorage.getItem(AUTH_KEYS.token)),
  clearSessionIfExpired: () => {
    const token = localStorage.getItem(AUTH_KEYS.token)
    if (token && !isAccessTokenValid(token)) authService.clearSession()
  },
  getCurrentUser: () => {
    const raw = getStoredUserRaw()
    if (!raw) return null
    const user = normalizeLoginResponse(raw)
    const token = user.token || localStorage.getItem(AUTH_KEYS.token) || ''
    const appRoles = mergeAppRoleNames(user.appRoles, getJwtAppRoles(token)).map((name) => {
      const fromStored = user.appRoles?.find((r) => r.toUpperCase() === name)
      return fromStored ?? name
    })
    return { ...user, appRoles }
  },
  getJwtAppRoles: () => getJwtAppRoles(localStorage.getItem(AUTH_KEYS.token)),
  getEffectiveAppRoles: () => authService.getCurrentUser()?.appRoles ?? [],
  refreshSession: async () => {
    const refreshToken = authService.getRefreshToken()
    if (!refreshToken) return null
    const { data } = await authService.refresh(refreshToken)
    authService.storeSession((data ?? {}) as Record<string, unknown>)
    return authService.getCurrentUser()
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
  canUsersAccess: () => authService.hasPermission(AUTH_PERMISSION_CODES.usersAccess),
  canCreateUsers: () => authService.hasPermission(AUTH_PERMISSION_CODES.createUsers),
  canApproveMembershipRequest: () =>
    authService.hasPermission(AUTH_PERMISSION_CODES.approveMembershipRequest) ||
    authService.hasAppRole('ADMIN'),
  canViewMembershipAudit: () =>
    authService.hasPermission(AUTH_PERMISSION_CODES.viewMembershipAudit) ||
    authService.hasAppRole('ADMIN'),
  canViewWorkoutPlanAudit: () =>
    authService.hasPermission(AUTH_PERMISSION_CODES.viewWorkoutPlanAudit),
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
