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

/** Full admin sidebar (not front-desk-only staff). */
export function isFullAdminNav(): boolean {
  return (
    authService.hasAppRole('ADMIN') ||
    authService.canConfigAccess() ||
    authService.canReportsAccess()
  )
}

/** Reception / front-desk: STAFF without ADMIN app role. */
export function isStaffFrontDeskOnly(): boolean {
  return authService.hasAppRole('STAFF') && !authService.hasAppRole('ADMIN')
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

export function canAccessAttendanceNav(): boolean {
  if (isStaffFrontDeskOnly()) return true
  return (
    canAccessNavSection(NavPermission.viewAttendance) ||
    canAccessNavSection(NavPermission.manageAttendance)
  )
}

/** Front-desk staff sidebar (reception). */
export const STAFF_FRONT_DESK_LINKS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/dashboard/attendance', label: 'Attendance' },
  { path: '/dashboard/users', label: 'Members' },
  { path: '/dashboard/user-memberships', label: 'Memberships' },
  { path: '/dashboard/access/scan', label: 'Check-in' },
] as const
