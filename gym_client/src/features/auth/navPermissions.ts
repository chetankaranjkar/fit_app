import { authService } from '../../services/auth.service'

/** Permission codes aligned with backend <see cref="PermissionCodes"/>. */
export const NavPermission = {
  reports: 'Reports',
  users: 'UsersAccess',
  config: 'Config',
  payments: 'Payments',
  trainer: 'TrainerAccess',
  createUsers: 'CreateUsers',
  viewAttendance: 'VIEW_ATTENDANCE',
  manageAttendance: 'MANAGE_ATTENDANCE',
} as const

export type StaffFrontDeskNavLink = {
  path: string
  label: string
}

/** Full admin sidebar (not front-desk-only staff). */
export function isFullAdminNav(): boolean {
  return (
    authService.hasAppRole('ADMIN') ||
    authService.canConfigAccess() ||
    authService.canReportsAccess()
  )
}

/**
 * Reception / front-desk operators: STAFF or RECEPTIONIST without owner-level admin nav.
 * ACCOUNTANT and TRAINER keep the full or trainer menu.
 */
export function isStaffFrontDeskOnly(): boolean {
  if (isFullAdminNav()) return false
  if (authService.hasAppRole('ADMIN')) return false
  return authService.hasAppRole('STAFF') || authService.hasAppRole('RECEPTIONIST')
}

export function canAccessLeadsNav(): boolean {
  return (
    authService.hasPermission('LEADS_CRM') || authService.hasPermission('LEADS_TRAINER')
  )
}

/** Routes front-desk staff may open (prefix match). */
export function getStaffFrontDeskAllowedPrefixes(): string[] {
  const prefixes = [
    '/dashboard',
    '/dashboard/reception',
    '/dashboard/attendance',
    '/dashboard/users',
    '/dashboard/user-memberships',
    '/dashboard/access/scan',
    '/dashboard/profile',
    '/dashboard/payments/collect',
    '/help',
  ]
  if (canAccessPaymentsNav()) {
    prefixes.push('/dashboard/payments')
  }
  return prefixes
}

/** Front-desk sidebar links filtered by permissions. */
export function getStaffFrontDeskNavLinks(): StaffFrontDeskNavLink[] {
  const links: StaffFrontDeskNavLink[] = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/dashboard/attendance', label: 'Attendance' },
  ]

  if (canAccessUsersNav()) {
    links.push({ path: '/dashboard/users', label: 'Members' })
  }

  if (canAccessPaymentsNav()) {
    links.push({ path: '/dashboard/user-memberships', label: 'Memberships' })
    links.push({ path: '/dashboard/payments/collect', label: 'Collect payment' })
  }

  links.push({ path: '/dashboard/access/scan', label: 'Check-in' })

  if (canAccessLeadsNav()) {
    links.push({ path: '/dashboard/reception', label: 'Lead CRM' })
  }

  return links
}

/** Section visible when user is full admin or holds the permission. */
export function canAccessNavSection(permissionCode: string): boolean {
  if (isFullAdminNav()) return true
  return authService.hasPermission(permissionCode)
}

export function canAccessUsersNav(): boolean {
  return canAccessNavSection(NavPermission.users)
}

export function canAccessTrainingNav(): boolean {
  return canAccessNavSection(NavPermission.trainer)
}

export function canAccessPaymentsNav(): boolean {
  return canAccessNavSection(NavPermission.payments)
}

export function canAccessReportsNav(): boolean {
  return canAccessNavSection(NavPermission.reports)
}

export function canAccessConfigNav(): boolean {
  return canAccessNavSection(NavPermission.config)
}

export function canAccessPtNav(): boolean {
  return (
    canAccessNavSection('MANAGE_PT_PACKAGES') ||
    canAccessNavSection('BOOK_PT_SESSIONS') ||
    canAccessNavSection('VIEW_PT_REPORTS')
  )
}

export function canAccessAttendanceNav(): boolean {
  if (isStaffFrontDeskOnly()) return true
  return (
    canAccessNavSection(NavPermission.viewAttendance) ||
    canAccessNavSection(NavPermission.manageAttendance)
  )
}
