/**
 * Maps URL paths to backend `module_key` for help articles & walkthroughs.
 * Longest prefix wins (e.g. `/dashboard/users/12` → members, not dashboard).
 */
const PREFIX_TO_MODULE: [string, string][] = [
  ['/dashboard/diet-plans/assign', 'diet_assign'],
  ['/dashboard/diet-plans/list', 'diet_plans'],
  ['/dashboard/diet-plans', 'diet_dashboard'],
  ['/dashboard/training/workout-assignments', 'workout_assignments'],
  ['/dashboard/training/workout-plan-builder', 'workout_plan_builder'],
  ['/dashboard/training/workout-studio', 'workout_studio'],
  ['/dashboard/training/exercises-premium', 'exercises_premium'],
  ['/dashboard/training/programs', 'workout_plans'],
  ['/dashboard/training/workout-plans', 'workout_plans'],
  ['/dashboard/training/exercises', 'exercises'],
  ['/dashboard/training/body-parts', 'body_parts'],
  ['/dashboard/gym-operations/maintenance', 'gym_ops_maintenance'],
  ['/dashboard/gym-operations/equipment', 'gym_ops_equipment'],
  ['/dashboard/gym-operations/expenses', 'gym_ops_expenses'],
  ['/dashboard/gym-operations/cleaning', 'gym_ops_cleaning'],
  ['/dashboard/gym-operations/vendors', 'gym_ops_vendors'],
  ['/dashboard/gym-operations/reports', 'gym_ops_reports'],
  ['/dashboard/locker-management/assignments', 'locker_assignments'],
  ['/dashboard/locker-management/access-logs', 'locker_access_logs'],
  ['/dashboard/locker-management/maintenance', 'locker_maintenance'],
  ['/dashboard/locker-management/reports', 'locker_reports'],
  ['/dashboard/locker-management/lockers', 'lockers'],
  ['/dashboard/user-memberships', 'user_memberships'],
  ['/dashboard/membership-plans', 'membership_plans'],
  ['/dashboard/access/owner-qr', 'owner_qr'],
  ['/dashboard/access/branches', 'branches'],
  ['/dashboard/access/scan', 'scan'],
  ['/dashboard/owner-analytics', 'owner_analytics'],
  ['/dashboard/users', 'members'],
  ['/dashboard/attendance', 'attendance'],
  ['/dashboard/payments', 'payments'],
  ['/dashboard/trainers', 'trainers'],
  ['/dashboard/roles', 'roles'],
  ['/dashboard/security', 'security'],
  ['/dashboard/profile', 'dashboard'],
  ['/dashboard', 'dashboard'],
  ['/help', 'help_center'],
]

const SORTED = [...PREFIX_TO_MODULE].sort((a, b) => b[0].length - a[0].length)

export function pathnameToModuleKey(pathname: string): string {
  const p = (pathname.replace(/\/+$/, '') || '/').split('?')[0] ?? '/'
  for (const [prefix, key] of SORTED) {
    if (p === prefix || p.startsWith(prefix + '/')) return key
  }
  if (p.startsWith('/help')) return 'help_center'
  if (p.startsWith('/dashboard')) return 'dashboard'
  return 'dashboard'
}
