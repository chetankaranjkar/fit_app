import type { QueryClient } from '@tanstack/react-query'

/** Prefix for `useAdminKpis` — includes permission flags in the full key. */
export const ADMIN_DASHBOARD_KPIS_QUERY_KEY = ['admin-dashboard-kpis'] as const

export const MEMBERSHIP_PAYMENTS_DASHBOARD_QUERY_KEY = ['membership-payments-dashboard'] as const

/** Call after payments, membership changes, or anything that affects dashboard KPIs. */
export function invalidateDashboardQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_KPIS_QUERY_KEY })
  void queryClient.invalidateQueries({ queryKey: MEMBERSHIP_PAYMENTS_DASHBOARD_QUERY_KEY })
}
