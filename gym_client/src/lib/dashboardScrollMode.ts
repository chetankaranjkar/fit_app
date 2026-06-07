/**
 * Routes where the main shell stays fixed and only the data grid panel scrolls.
 * Keep this list aligned with pages that use EnterpriseDataGrid inside
 * DataPageSection + DashboardTablePanel (flex-1) layout.
 */
const EXACT_LOCK_ROUTES = new Set([
  '/dashboard/users',
  '/dashboard/trainers',
  '/dashboard/payments',
  '/dashboard/user-memberships',
  '/dashboard/membership-plans',
  '/dashboard/retail/products',
  '/dashboard/personal-training/sessions',
  '/dashboard/gym-operations/expenses',
])

export function isDataGridViewportRoute(pathname: string): boolean {
  return EXACT_LOCK_ROUTES.has(pathname)
}
