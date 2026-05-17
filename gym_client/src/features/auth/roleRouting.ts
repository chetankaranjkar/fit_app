import type { LoginResponse } from '../../types/auth'
import { Role } from '../../types/auth'
import { authService } from '../../services/auth.service'
import {
  canAccessAttendanceNav,
  canAccessConfigNav,
  canAccessPaymentsNav,
  canAccessReportsNav,
  canAccessTrainingNav,
  canAccessUsersNav,
  isStaffFrontDeskOnly,
} from './navPermissions'

export type DashboardRole = 'admin' | 'trainer' | 'member'

export function resolveDashboardRole(user: LoginResponse | null | undefined): DashboardRole {
  if (!user) return 'member'

  const appRoles = (user.appRoles ?? []).map((r) => r.trim().toUpperCase()).filter(Boolean)

  if (appRoles.includes('ADMIN') || appRoles.includes('STAFF')) return 'admin'
  if (appRoles.includes('TRAINER')) return 'trainer'
  if (appRoles.includes('MEMBER')) return 'member'

  const legacy = user.role
  const legacyStr = legacy != null ? String(legacy).toLowerCase() : ''
  if (legacy === Role.Admin || legacyStr === 'admin' || legacyStr === '3') return 'admin'
  if (legacy === Role.Instructor || legacyStr === 'instructor' || legacyStr === 'trainer' || legacyStr === '2')
    return 'trainer'

  if (authService.hasPermission('Reports') || authService.hasPermission('Config')) return 'admin'
  if (authService.hasPermission('TrainerAccess') && !authService.hasPermission('UsersAccess')) return 'trainer'

  return 'member'
}

export function getCurrentDashboardRole(): DashboardRole {
  return resolveDashboardRole(authService.getCurrentUser())
}

export function getPostLoginPath(_role: DashboardRole): string {
  return '/dashboard'
}

/** Prefixes blocked per role (admin has full access). */
const TRAINER_BLOCKED_PREFIXES = [
  '/dashboard/roles',
  '/dashboard/security',
  '/dashboard/owner-analytics',
  '/dashboard/gym-operations',
  '/dashboard/locker-management',
  '/dashboard/payments',
  '/dashboard/membership-plans',
]

const MEMBER_ALLOWED_PREFIXES = [
  '/dashboard',
  '/dashboard/access/scan',
  '/dashboard/profile',
  '/dashboard/member',
  '/help',
]

const STAFF_ALLOWED_PREFIXES = [
  '/dashboard',
  '/dashboard/attendance',
  '/dashboard/users',
  '/dashboard/user-memberships',
  '/dashboard/membership-plans',
  '/dashboard/access/scan',
  '/dashboard/profile',
  '/help',
]

export function isPathAllowedForRole(pathname: string, role: DashboardRole): boolean {
  if (role === 'admin') {
    if (isStaffFrontDeskOnly()) {
      return STAFF_ALLOWED_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith('/help'),
      )
    }
    return pathname.startsWith('/dashboard') || pathname.startsWith('/help')
  }

  if (role === 'member') {
    return MEMBER_ALLOWED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith('/help'),
    )
  }

  if (TRAINER_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))) return false

  if (pathname.startsWith('/dashboard/users') && !canAccessUsersNav()) return false
  if (pathname.startsWith('/dashboard/attendance') && !canAccessAttendanceNav()) return false
  if (pathname.startsWith('/dashboard/payments') && !canAccessPaymentsNav()) return false
  if (pathname.startsWith('/dashboard/roles') && !canAccessConfigNav()) return false
  if (pathname.startsWith('/dashboard/security') && !canAccessReportsNav()) return false
  if (pathname.startsWith('/dashboard/owner-analytics') && !canAccessReportsNav()) return false
  if (
    (pathname.startsWith('/dashboard/training') || pathname.startsWith('/dashboard/diet-plans')) &&
    !canAccessTrainingNav()
  ) {
    return false
  }
  if (
    (pathname.startsWith('/dashboard/gym-operations') ||
      pathname.startsWith('/dashboard/locker-management')) &&
    !canAccessReportsNav() &&
    !canAccessConfigNav()
  ) {
    return false
  }

  return pathname.startsWith('/dashboard') || pathname.startsWith('/help')
}
