/**
 * Routes where the main shell stays fixed and only the data grid panel scrolls.
 * `/dashboard/users` and `/dashboard/user-memberships` use page scroll (KPI strips, renewal queue, etc.).
 */
const EXACT_LOCK_ROUTES = new Set([
  '/dashboard/payments',
  '/dashboard/membership-plans',
  '/dashboard/retail/products',
  '/dashboard/personal-training/sessions',
  '/dashboard/gym-operations/expenses',
])

export function isDataGridViewportRoute(pathname: string): boolean {
  return EXACT_LOCK_ROUTES.has(pathname)
}
