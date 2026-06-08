import type { LoginResponse } from '../../types/auth'
import { Role } from '../../types/auth'
import { authService } from '../../services/auth.service'
import { getStaffFrontDeskAllowedPrefixes } from './navPermissions'

export type DashboardRole = 'admin' | 'trainer' | 'member' | 'other'

const OTHER_APP_ROLES = new Set(['STAFF', 'RECEPTIONIST', 'ACCOUNTANT'])
const PERSONA_ORDER: DashboardRole[] = ['admin', 'trainer', 'member', 'other']
const ACTIVE_PERSONA_KEY_PREFIX = 'gym-active-persona'

function normalizeAppRoles(user: LoginResponse | null | undefined): string[] {
  if (!user) return []
  const stored = (user.appRoles ?? []).map((r) => r.trim().toUpperCase()).filter(Boolean)
  const jwt = authService.getJwtAppRoles()
  return [...new Set([...stored, ...jwt])]
}

/** Merge stored session roles with optional live roles from the API. */
export function resolveAppRolesForPersonas(
  user: LoginResponse | null | undefined,
  liveRoleNames?: string[],
): string[] {
  const base = normalizeAppRoles(user)
  const live = (liveRoleNames ?? []).map((r) => r.trim().toUpperCase()).filter(Boolean)
  return [...new Set([...base, ...live])]
}

function hasAdminPersona(user: LoginResponse, appRoles: string[]): boolean {
  if (appRoles.includes('ADMIN')) return true

  const legacy = user.role
  const legacyStr = legacy != null ? String(legacy).toLowerCase() : ''
  if (legacy === Role.Admin || legacyStr === 'admin' || legacyStr === '3') return true

  const codes = new Set((user.permissions ?? []).map((p) => p.code))
  if (codes.has('Reports') || codes.has('Config')) return true

  return false
}

function hasTrainerPersona(user: LoginResponse, appRoles: string[]): boolean {
  if (appRoles.includes('TRAINER')) return true

  const legacy = user.role
  const legacyStr = legacy != null ? String(legacy).toLowerCase() : ''
  if (
    legacy === Role.Instructor ||
    legacyStr === 'instructor' ||
    legacyStr === 'trainer' ||
    legacyStr === '2'
  ) {
    return true
  }

  const codes = new Set((user.permissions ?? []).map((p) => p.code))
  return codes.has('TrainerAccess') && !codes.has('UsersAccess')
}

function hasMemberPersona(user: LoginResponse, appRoles: string[]): boolean {
  if (appRoles.includes('MEMBER')) return true

  const legacy = user.role
  const legacyStr = legacy != null ? String(legacy).toLowerCase() : ''
  if (legacy === Role.User || legacyStr === 'user' || legacyStr === 'member' || legacyStr === '1') {
    return true
  }

  return false
}

function hasOtherPersona(appRoles: string[]): boolean {
  return appRoles.some((r) => OTHER_APP_ROLES.has(r))
}

/** Personas the signed-in user may switch between in the header. */
export function getAvailablePersonas(
  user: LoginResponse | null | undefined,
  liveRoleNames?: string[],
): DashboardRole[] {
  if (!user) return ['member']

  const appRoles = resolveAppRolesForPersonas(user, liveRoleNames)
  const personas: DashboardRole[] = []

  if (appRoles.length > 0) {
    if (appRoles.includes('ADMIN')) personas.push('admin')
    if (appRoles.includes('TRAINER')) personas.push('trainer')
    if (appRoles.includes('MEMBER')) personas.push('member')
    if (hasOtherPersona(appRoles)) personas.push('other')
  } else {
    if (hasAdminPersona(user, appRoles)) personas.push('admin')
    if (hasTrainerPersona(user, appRoles)) personas.push('trainer')
    if (hasMemberPersona(user, appRoles)) personas.push('member')
  }

  if (personas.length === 0) personas.push('member')

  return PERSONA_ORDER.filter((p) => personas.includes(p))
}

function personaStorageKey(userId?: number): string {
  return `${ACTIVE_PERSONA_KEY_PREFIX}:${userId ?? 'anonymous'}`
}

export function readStoredPersona(userId?: number): DashboardRole | null {
  try {
    const raw = localStorage.getItem(personaStorageKey(userId))
    if (
      raw === 'admin' ||
      raw === 'trainer' ||
      raw === 'member' ||
      raw === 'other'
    ) {
      return raw
    }
  } catch {
    /* ignore */
  }
  return null
}

export function persistActivePersona(userId: number | undefined, persona: DashboardRole): void {
  try {
    localStorage.setItem(personaStorageKey(userId), persona)
  } catch {
    /* ignore */
  }
}

export function getDefaultPersona(
  available: DashboardRole[],
  userId?: number,
): DashboardRole {
  if (available.length === 0) return 'member'
  const stored = readStoredPersona(userId)
  if (stored && available.includes(stored)) return stored
  return PERSONA_ORDER.find((p) => available.includes(p)) ?? available[0]
}

export function getPersonaLabel(persona: DashboardRole): string {
  switch (persona) {
    case 'admin':
      return 'Admin'
    case 'trainer':
      return 'Trainer'
    case 'member':
      return 'Member'
    case 'other':
      return 'Staff'
  }
}

/** @deprecated Prefer getDefaultPersona(getAvailablePersonas(user)) */
export function resolveDashboardRole(user: LoginResponse | null | undefined): DashboardRole {
  return getDefaultPersona(getAvailablePersonas(user), user?.userId)
}

export function getCurrentDashboardRole(): DashboardRole {
  return resolveDashboardRole(authService.getCurrentUser())
}

export function getPostLoginPath(_role: DashboardRole): string {
  return '/dashboard'
}

const MEMBER_ALLOWED_PREFIXES = [
  '/dashboard',
  '/dashboard/access/scan',
  '/dashboard/profile',
  '/dashboard/member',
  '/help',
]

/** Coach persona — aligned with trainer sidebar (not full admin). */
const TRAINER_ALLOWED_PREFIXES = [
  '/dashboard',
  '/dashboard/users',
  '/dashboard/attendance',
  '/dashboard/access/scan',
  '/dashboard/training',
  '/dashboard/diet-plans',
  '/dashboard/supplements/master',
  '/dashboard/reception',
  '/dashboard/profile',
  '/dashboard/personal-training',
  '/help',
]

/**
 * `/dashboard` matches only the hub exactly — not every `/dashboard/*` route.
 */
export function matchesAllowedPrefix(pathname: string, prefix: string): boolean {
  if (prefix === '/help') {
    return pathname === '/help' || pathname.startsWith('/help/')
  }
  if (prefix === '/dashboard') {
    return pathname === '/dashboard'
  }
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function matchesAnyAllowedPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => matchesAllowedPrefix(pathname, p))
}

export function isPathAllowedForRole(pathname: string, role: DashboardRole): boolean {
  if (role === 'admin') {
    return pathname.startsWith('/dashboard') || pathname.startsWith('/help')
  }

  if (role === 'other') {
    return matchesAnyAllowedPrefix(pathname, getStaffFrontDeskAllowedPrefixes())
  }

  if (role === 'member') {
    return matchesAnyAllowedPrefix(pathname, MEMBER_ALLOWED_PREFIXES)
  }

  if (role === 'trainer') {
    return matchesAnyAllowedPrefix(pathname, TRAINER_ALLOWED_PREFIXES)
  }

  return false
}
