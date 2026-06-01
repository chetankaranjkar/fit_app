/**
 * Route prefetch registry.
 *
 * Every sidebar destination registers its dynamic `import()` here so the
 * sidebar can warm the chunk as soon as the pointer enters the link (or the
 * link receives keyboard focus). By the time the user actually clicks, the
 * chunk is already downloaded + evaluated, so navigation feels instant even
 * from heavy pages like `TrainerDetailPage` (recharts + large tables).
 *
 * Implementation notes:
 * - `import()` is module-cache-keyed by specifier, so both `prefetchRoute()`
 *   and `React.lazy(() => import('...'))` resolve the exact same Promise.
 * - Results are memoized in a local `Map` so repeated hovers don't recreate
 *   the Promise wrapper.
 * - Prefetches are fire-and-forget; they swallow errors (the real import
 *   inside `React.lazy` will surface any failure via `<Suspense>` as usual).
 */

type Loader = () => Promise<unknown>

const loaders: Record<string, Loader> = {
  // Top-level
  '/': () => import('../pages/LandingPage'),
  '/login': () => import('../pages/LoginPage'),
  '/dashboard': () => import('../pages/dashboards/DashboardHubPage'),
  '/dashboard/profile': () => import('../pages/member/MemberProfilePage'),
  '/dashboard/member/portal': () => import('../pages/member/MemberPortalPage'),
  '/dashboard/payments': () => import('../pages/PaymentsPage'),
  '/dashboard/payments/collect': () => import('../pages/CollectMembershipPaymentPage'),
  '/dashboard/payments/history': () => import('../pages/MembershipPaymentHistoryPage'),
  '/dashboard/payments/waive-offs': () => import('../pages/WaiveOffRequestsPage'),
  '/dashboard/payments/reports': () => import('../pages/BillingReportsPage'),
  '/dashboard/security': () => import('../pages/SecurityPage'),
  '/dashboard/roles': () => import('../pages/RolesPage'),
  '/dashboard/trainers': () => import('../pages/TrainersPage'),

  // Users group
  '/dashboard/reception': () => import('../pages/reception/ReceptionCrmPage'),
  '/dashboard/users': () => import('../pages/UsersPage'),
  '/dashboard/user-memberships': () => import('../pages/UserMembershipsPage'),
  '/dashboard/membership-plans': () => import('../pages/MembershipPlansPage'),

  // Training group
  '/dashboard/training/body-parts': () => import('../pages/training/BodyPartsPage'),
  '/dashboard/training/exercises': () => import('../pages/training/ExercisesPage'),
  '/dashboard/training/programs': () => import('../pages/training/ProgramsPage'),

  // Diet group
  '/dashboard/diet-plans': () => import('../pages/DietPlansDashboardPage'),
  '/dashboard/diet-plans/list': () => import('../pages/DietPlansPage'),
  '/dashboard/diet-plans/assign': () => import('../pages/AssignDietPlansPage'),

  // Gym Operations module (all share one chunk via the barrel export)
  '/dashboard/gym-operations/equipment': () => import('../modules/gym-operations'),
  '/dashboard/gym-operations/maintenance': () => import('../modules/gym-operations'),
  '/dashboard/gym-operations/expenses': () => import('../modules/gym-operations'),
  '/dashboard/gym-operations/cleaning': () => import('../modules/gym-operations'),
  '/dashboard/gym-operations/vendors': () => import('../modules/gym-operations'),
  '/dashboard/gym-operations/reports': () => import('../modules/gym-operations'),

  // Locker Management module (all share one chunk via the barrel export)
  '/dashboard/locker-management/lockers': () => import('../modules/locker-management'),
  '/dashboard/locker-management/assignments': () => import('../modules/locker-management'),
  '/dashboard/locker-management/access-logs': () => import('../modules/locker-management'),
  '/dashboard/locker-management/maintenance': () => import('../modules/locker-management'),
  '/dashboard/locker-management/reports': () => import('../modules/locker-management'),

  // Owner Analytics module
  '/dashboard/owner-analytics': () => import('../modules/owner-analytics'),

  '/dashboard/access/branches': () => import('../pages/BranchesPage'),
  '/dashboard/access/owner-qr': () => import('../pages/OwnerQrDashboard'),
  '/dashboard/access/scan': () => import('../pages/scan/ScanPage'),
}

const inflight = new Map<string, Promise<unknown>>()

/**
 * Warm the chunk for `path` if registered. Safe to call many times — repeat
 * calls return the same cached Promise.
 */
export function prefetchRoute(path: string): Promise<unknown> | undefined {
  const loader = loaders[path]
  if (!loader) return undefined
  const cached = inflight.get(path)
  if (cached) return cached
  const p = loader().catch(() => {
    // Drop the failed entry so the user's actual click can retry.
    inflight.delete(path)
  })
  inflight.set(path, p)
  return p
}

/**
 * Convenience prop-spreader for `<Link>` / `<button>` elements in the sidebar.
 * Usage: `<Link to={path} {...linkPrefetchProps(path)} />`
 */
export function linkPrefetchProps(path: string) {
  const handler = () => {
    prefetchRoute(path)
  }
  return {
    onMouseEnter: handler,
    onFocus: handler,
    onTouchStart: handler,
  }
}
