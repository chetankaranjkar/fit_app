import type { DashboardRole } from '../../features/auth/roleRouting'
import {
  canAccessAttendanceNav,
  canAccessTrainingNav,
  canAccessUsersNav,
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
    { path: '/dashboard/users', label: 'Clients', icon: 'users' },
    { path: '/dashboard/attendance', label: 'Attendance', icon: 'attendance' },
    { path: '/dashboard/access/scan', label: 'Check-in', icon: 'scan' },
  ],
  member: [
    { path: '/dashboard', label: 'Home', icon: 'dashboard' },
    { path: '/dashboard/member/workouts', label: 'Workouts', icon: 'workouts' },
    { path: '/dashboard/member/diet', label: 'Diet', icon: 'diet' },
    { path: '/dashboard/member/progress', label: 'Progress', icon: 'progress' },
    { path: '/dashboard/profile', label: 'Profile', icon: 'profile' },
  ],
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
        { path: '/dashboard/training/exercises-premium', label: 'Exercises premium' },
        { path: '/dashboard/training/workout-plans', label: 'Workout plans' },
        { path: '/dashboard/training/workout-assignments', label: 'Assignments' },
        { path: '/dashboard/training/workout-plan-builder', label: 'Plan builder' },
        { path: '/dashboard/training/workout-studio', label: 'Workout studio' },
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
      ],
    },
  ],
  member: [],
}

export const ROLE_BRAND: Record<
  DashboardRole,
  { title: string; subtitle: string; accent: 'admin' | 'trainer' | 'member' }
> = {
  admin: { title: 'PulseFit', subtitle: 'Business Suite', accent: 'admin' },
  trainer: { title: 'PulseFit', subtitle: 'Coach Hub', accent: 'trainer' },
  member: { title: 'PulseFit', subtitle: 'Member', accent: 'member' },
}

export function getTrainerNavItems(): NavItem[] {
  return ROLE_NAV.trainer.filter((item) => {
    if (item.path === '/dashboard/users') return canAccessUsersNav()
    if (item.path === '/dashboard/attendance') return canAccessAttendanceNav()
    return true
  })
}

export function getTrainerNavGroups(): NavGroup[] {
  if (!canAccessTrainingNav()) return []
  return ROLE_NAV_GROUPS.trainer
}
