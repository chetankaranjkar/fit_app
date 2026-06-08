import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { MemberPaymentBlockedHost } from '../../billing/MemberPaymentBlockedHost'
import { DashboardSessionProvider } from '../DashboardSessionContext'
import { DashboardRoleProvider, usePersona } from '../DashboardRoleContext'
import { isPathAllowedForRole } from '../roleRouting'

function DashboardShellInner() {
  const location = useLocation()
  const { activePersona } = usePersona()

  if (!isPathAllowedForRole(location.pathname, activePersona)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <DashboardSessionProvider>
      <MemberPaymentBlockedHost />
      <Outlet />
    </DashboardSessionProvider>
  )
}

/** Enforces role-based route access under /dashboard. */
export function DashboardShell() {
  return (
    <DashboardRoleProvider>
      <DashboardShellInner />
    </DashboardRoleProvider>
  )
}
