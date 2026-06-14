import type { DashboardRole } from '../../features/auth/roleRouting'
import {
  canAccessAttendanceNav,
  canAccessClientsNav,
  canAccessTrainingNav,
  getStaffFrontDeskNavLinks,
} from '../../features/auth/navPermissions'

export type NavIcon =
  | 'dashboard'
  | 'users'
  | 'trainers'
  | 'payments'
  | 'attendance'
  | 'plans'
  | 'analytics'
  | 'security'
  | 'settings'
  | 'workouts'
  | 'diet'
  | 'progress'
  | 'profile'
  | 'scan'

export type NavItem = {
  path: string
  label: string
  icon: NavIcon
}

export type NavGroup = {
  id: string
  label: string
  icon: NavIcon
  children: { path: string; label: string }[]
}

/** Top-level links per role (admin uses full SidebarNav instead). */
export const ROLE_NAV: Record<DashboardRole, NavItem[]> = {
  admin: [],
  trainer: [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/dashboard/users', label: 'Members', icon: 'users' },
    { path: '/dashboard/attendance', label: 'Attendance', icon: 'attendance' },
    { path: '/dashboard/access/scan', label: 'Check-in', icon: 'scan' },
  ],
  member: [
    { path: '/dashboard', label: 'Home', icon: 'dashboard' },
    { path: '/dashboard/member/workouts', label: 'Workouts', icon: 'workouts' },
    { path: '/dashboard/member/diet', label: 'Diet', icon: 'diet' },
    { path: '/dashboard/member/progress', label: 'Progress', icon: 'progress' },
    { path: '/dashboard/member/health-profile', label: 'Health Profile', icon: 'profile' },
    { path: '/dashboard/member/supplements', label: 'Supplements', icon: 'diet' },
    { path: '/dashboard/profile', label: 'Profile', icon: 'profile' },
  ],
  other: [],
}

/** Collapsible sections (trainer coaching tools). */
export const ROLE_NAV_GROUPS: Record<DashboardRole, NavGroup[]> = {
  admin: [],
  trainer: [
    {
      id: 'training',
      label: 'Training',
      icon: 'workouts',
      children: [
        { path: '/dashboard/training/body-parts', label: 'Body parts' },
        { path: '/dashboard/training/exercises', label: 'Exercises' },
        { path: '/dashboard/training/warmups', label: 'Warmups' },
        { path: '/dashboard/training/stretches', label: 'Stretches' },
        { path: '/dashboard/training/workout-categories', label: 'Workout categories' },
        { path: '/dashboard/training/programs', label: 'Programs' },
        { path: '/dashboard/training/workout-assignments', label: 'Assignments' },
      ],
    },
    {
      id: 'diet',
      label: 'Diet',
      icon: 'diet',
      children: [
        { path: '/dashboard/diet-plans', label: 'Diet dashboard' },
        { path: '/dashboard/diet-plans/list', label: 'All diet plans' },
        { path: '/dashboard/diet-plans/assign', label: 'Assign to clients' },
        { path: '/dashboard/supplements/master', label: 'Supplement catalog' },
      ],
    },
  ],
  member: [],
  other: [],
}

export const ROLE_BRAND: Record<
  DashboardRole,
  { title: string; subtitle: string; accent: 'admin' | 'trainer' | 'member' | 'other' }
> = {
  admin: { title: 'Tiger Fitness', subtitle: 'Business Suite', accent: 'admin' },
  trainer: { title: 'Tiger Fitness', subtitle: 'Coach Hub', accent: 'trainer' },
  member: { title: 'Tiger Fitness', subtitle: 'Member', accent: 'member' },
  other: { title: 'Tiger Fitness', subtitle: 'Staff', accent: 'other' },
}

function staffPathIcon(path: string): NavIcon {
  if (path.includes('attendance')) return 'attendance'
  if (path.includes('users')) return 'users'
  if (path.includes('membership') || path.includes('payments')) return 'payments'
  if (path.includes('scan')) return 'scan'
  if (path.includes('reception')) return 'users'
  return 'dashboard'
}

export function getOtherNavItems(): NavItem[] {
  return getStaffFrontDeskNavLinks().map((link) => ({
    path: link.path,
    label: link.label,
    icon: staffPathIcon(link.path),
  }))
}

export function getTrainerNavItems(): NavItem[] {
  return ROLE_NAV.trainer.filter((item) => {
    if (item.path === '/dashboard/users') return canAccessClientsNav()
    if (item.path === '/dashboard/attendance') return canAccessAttendanceNav()
    return true
  })
}

export function getTrainerNavGroups(): NavGroup[] {
  if (!canAccessTrainingNav()) return []
  return ROLE_NAV_GROUPS.trainer
}
