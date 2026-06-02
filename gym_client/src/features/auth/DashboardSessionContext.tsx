import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { authService } from '../../services/auth.service'

const SESSION_WARNING_LEAD_SECONDS = 120

type DashboardSessionContextValue = {
  openSessionWarning: () => void
}

const DashboardSessionContext = createContext<DashboardSessionContextValue | null>(null)

export function useDashboardSession() {
  const ctx = useContext(DashboardSessionContext)
  return ctx ?? { openSessionWarning: () => {} }
}

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, '=')
    const jsonPayload = window.atob(padded)
    const payload = JSON.parse(jsonPayload) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/** Single session-expiry host for all /dashboard routes (avoids remount logout on Profile navigation). */
export function DashboardSessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)
  const expiryAtMsRef = useRef<number | null>(null)
  const warningTimerRef = useRef<number | null>(null)
  const logoutTimerRef = useRef<number | null>(null)

  const clearSessionTimers = () => {
    if (warningTimerRef.current != null) {
      window.clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (logoutTimerRef.current != null) {
      window.clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
  }

  const forceLogoutToLogin = useCallback(
    async (message: string) => {
      clearSessionTimers()
      setSessionWarningOpen(false)
      if (authService.isAccessTokenValid()) {
        try {
          await authService.logout()
        } catch {
          /* ignore */
        }
      }
      authService.setSessionExpiredMessage(message)
      authService.clearSession()
      navigate('/login', { replace: true })
    },
    [navigate],
  )

  const refreshSessionAndReschedule = useCallback(async (): Promise<boolean> => {
    const refreshToken = authService.getRefreshToken()
    if (!refreshToken) return false
    try {
      const { data } = await authService.refresh(refreshToken)
      const normalized = authService.normalizeLoginResponse(
        (data ?? {}) as unknown as Record<string, unknown>,
      )
      if (!normalized.token?.trim()) return false
      authService.storeSession(normalized)
      return true
    } catch {
      return false
    }
  }, [])

  const scheduleSessionTimers = useCallback(
    (token: string | null) => {
      clearSessionTimers()
      setSessionWarningOpen(false)
      setSecondsLeft(0)

      if (!token) return
      const expiryMs = decodeJwtExpiryMs(token)
      if (!expiryMs) return
      expiryAtMsRef.current = expiryMs

      const now = Date.now()
      const msUntilExpiry = expiryMs - now

      if (msUntilExpiry <= 0) {
        void (async () => {
          const refreshed = await refreshSessionAndReschedule()
          if (!refreshed) {
            await forceLogoutToLogin('Your session expired. Please login again.')
          } else {
            scheduleSessionTimers(authService.getAccessToken())
          }
        })()
        return
      }

      if (msUntilExpiry <= SESSION_WARNING_LEAD_SECONDS * 1000) {
        void refreshSessionAndReschedule().then((ok) => {
          if (ok) scheduleSessionTimers(authService.getAccessToken())
        })
      }

      const warningAt = expiryMs - SESSION_WARNING_LEAD_SECONDS * 1000
      const warningDelay = Math.max(warningAt - now, 0)
      const logoutDelay = msUntilExpiry

      warningTimerRef.current = window.setTimeout(() => {
        const left = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000))
        setSecondsLeft(left)
        setSessionWarningOpen(true)
      }, warningDelay)

      logoutTimerRef.current = window.setTimeout(() => {
        void forceLogoutToLogin('Your session expired. Please login again.')
      }, logoutDelay)
    },
    [forceLogoutToLogin, refreshSessionAndReschedule],
  )

  const openSessionWarning = useCallback(() => {
    const expiryMs = expiryAtMsRef.current ?? decodeJwtExpiryMs(authService.getAccessToken() ?? '')
    if (!expiryMs) return
    const left = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000))
    setSecondsLeft(left)
    setSessionWarningOpen(true)
  }, [])

  useEffect(() => {
    scheduleSessionTimers(authService.getAccessToken())

    const handleFocus = () => {
      scheduleSessionTimers(authService.getAccessToken())
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearSessionTimers()
    }
  }, [scheduleSessionTimers])

  useEffect(() => {
    if (!sessionWarningOpen) return
    const interval = window.setInterval(() => {
      const expiryMs = expiryAtMsRef.current
      if (!expiryMs) return
      const left = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left <= 0) {
        window.clearInterval(interval)
        void forceLogoutToLogin('Your session expired. Please login again.')
      }
    }, 1000)
    return () => window.clearInterval(interval)
  }, [sessionWarningOpen, forceLogoutToLogin])

  const handleContinueSession = async () => {
    const refreshToken = authService.getRefreshToken()
    if (!refreshToken) {
      await forceLogoutToLogin('Your session expired. Please login again.')
      return
    }
    try {
      setIsRefreshingSession(true)
      const refreshed = await refreshSessionAndReschedule()
      if (!refreshed) throw new Error('Refresh response did not include token')
      scheduleSessionTimers(authService.getAccessToken())
      setSessionWarningOpen(false)
    } catch {
      await forceLogoutToLogin('Session refresh failed. Please login again.')
    } finally {
      setIsRefreshingSession(false)
    }
  }

  return (
    <DashboardSessionContext.Provider value={{ openSessionWarning }}>
      {children}
      <Modal
        open={sessionWarningOpen}
        onClose={() => setSessionWarningOpen(false)}
        title="Session expiring soon"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-200">
            Your session will expire in{' '}
            <span className="font-semibold text-amber-300">{secondsLeft}s</span>. Continue to stay
            signed in.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                void forceLogoutToLogin('You were logged out. Please login again.')
              }}
            >
              Logout now
            </Button>
            <Button isLoading={isRefreshingSession} onClick={() => void handleContinueSession()}>
              Continue session
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardSessionContext.Provider>
  )
}
