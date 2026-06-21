import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { MemberPaymentBlockedHost } from '../../billing/MemberPaymentBlockedHost'
import { DashboardSessionProvider } from '../DashboardSessionContext'
import { DashboardRoleProvider, usePersona } from '../DashboardRoleContext'
import { getPersonaHomePath, isPathAllowedForRole } from '../roleRouting'

function DashboardShellInner() {
  const location = useLocation()
  const { activePersona } = usePersona()

  if (!isPathAllowedForRole(location.pathname, activePersona)) {
    return <Navigate to={getPersonaHomePath(activePersona)} replace />
  }

  if (activePersona === 'member' && location.pathname === '/dashboard') {
    return <Navigate to="/dashboard/member/portal" replace />
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
