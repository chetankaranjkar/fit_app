import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { MemberPaymentBlockedHost } from '../../billing/MemberPaymentBlockedHost'
import { DashboardSessionProvider } from '../DashboardSessionContext'
import { DashboardRoleProvider } from '../DashboardRoleContext'
import { getCurrentDashboardRole, isPathAllowedForRole } from '../roleRouting'

/** Enforces role-based route access under /dashboard. */
export function DashboardShell() {
  const location = useLocation()
  const role = getCurrentDashboardRole()

  if (!isPathAllowedForRole(location.pathname, role)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <DashboardRoleProvider value={role}>
      <DashboardSessionProvider>
        <MemberPaymentBlockedHost />
        <Outlet />
      </DashboardSessionProvider>
    </DashboardRoleProvider>
  )
}
