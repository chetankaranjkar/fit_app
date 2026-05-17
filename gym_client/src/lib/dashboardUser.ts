import { authService } from '../services/auth.service'

export function getDashboardUser() {
  const session = authService.getCurrentUser()
  if (session) {
    return {
      userName: session.fullName?.trim() || session.username?.trim() || 'User',
      userAvatarUrl: null as string | null,
    }
  }
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User', userAvatarUrl: null }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return {
      userName: user?.fullName?.trim() || user?.username?.trim() || 'User',
      userAvatarUrl: null,
    }
  } catch {
    return { userName: 'User', userAvatarUrl: null }
  }
}
