import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { authService } from '../../../services/auth.service'

/** Redirects unauthenticated users to login. */
export function RequireAuth() {
  const location = useLocation()
  const token = authService.getAccessToken()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
