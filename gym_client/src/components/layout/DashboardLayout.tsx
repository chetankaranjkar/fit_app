import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LocomotiveScroll from 'locomotive-scroll'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SidebarNav } from './SidebarNav'
import { TopNavbar } from './TopNavbar'
import { setupScrollTrigger, cleanupScrollTrigger } from '../../lib/animations/gsapSetup'
import { setLocomotiveScrollInstance } from '../../lib/scrollInstance'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { authService } from '../../services/auth.service'

const SIDEBAR_COLLAPSED_KEY = 'gym-sidebar-collapsed'
const SESSION_WARNING_LEAD_SECONDS = 120

function getInitialCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return stored === 'true'
  } catch {
    return false
  }
}

export function DashboardLayout({
  children,
  userName,
  userAvatarUrl,
}: {
  children: ReactNode
  userName: string
  userAvatarUrl?: string | null
}) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)
  const scrollWrapperRef = useRef<HTMLDivElement>(null)
  const scrollInstanceRef = useRef<LocomotiveScroll | null>(null)
  const expiryAtMsRef = useRef<number | null>(null)
  const warningTimerRef = useRef<number | null>(null)
  const logoutTimerRef = useRef<number | null>(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()

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

  const decodeJwtExpiryMs = (token: string): number | null => {
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

  const forceLogoutToLogin = async (message: string) => {
    clearSessionTimers()
    setSessionWarningOpen(false)
    try {
      await authService.logout()
    } catch {
      // Ignore API failure and proceed with local cleanup.
    }
    authService.setSessionExpiredMessage(message)
    authService.clearSession()
    navigate('/login', { replace: true })
  }

  const scheduleSessionTimers = (token: string | null) => {
    clearSessionTimers()
    setSessionWarningOpen(false)
    setSecondsLeft(0)

    if (!token) return
    const expiryMs = decodeJwtExpiryMs(token)
    if (!expiryMs) return
    expiryAtMsRef.current = expiryMs

    const now = Date.now()
    const warningAt = expiryMs - SESSION_WARNING_LEAD_SECONDS * 1000
    const warningDelay = Math.max(warningAt - now, 0)
    const logoutDelay = Math.max(expiryMs - now, 0)

    warningTimerRef.current = window.setTimeout(() => {
      const left = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000))
      setSecondsLeft(left)
      setSessionWarningOpen(true)
    }, warningDelay)

    logoutTimerRef.current = window.setTimeout(() => {
      void forceLogoutToLogin('Your session expired. Please login again.')
    }, logoutDelay)
  }

  useEffect(() => {
    const wrapper = scrollWrapperRef.current
    if (!wrapper) return
    const content = wrapper.firstElementChild as HTMLElement | null
    if (!content) return

    // Register GSAP plugin
    gsap.registerPlugin(ScrollTrigger)

    const locomotiveScroll = new LocomotiveScroll({
      lenisOptions: {
        wrapper,
        content,
        smoothWheel: true,
        lerp: 0.1,
      },
    })
    scrollInstanceRef.current = locomotiveScroll
    setLocomotiveScrollInstance(locomotiveScroll)

    setupScrollTrigger(locomotiveScroll, wrapper)

    setTimeout(() => {
      ScrollTrigger.refresh()
    }, 200)

    return () => {
      cleanupScrollTrigger()
      locomotiveScroll.destroy()
      setLocomotiveScrollInstance(null)
      scrollInstanceRef.current = null
    }
  }, [collapsed])

  useEffect(() => {
    scrollInstanceRef.current?.scrollTo(0, { duration: 0, immediate: true })
    // Close the mobile drawer on navigation
    setMobileOpen(false)
  }, [pathname])

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
  }, [])

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
  }, [sessionWarningOpen])

  const handleContinueSession = async () => {
    const refreshToken = authService.getRefreshToken()
    if (!refreshToken) {
      await forceLogoutToLogin('Your session expired. Please login again.')
      return
    }
    try {
      setIsRefreshingSession(true)
      const { data } = await authService.refresh(refreshToken)
      const normalized = authService.normalizeLoginResponse(
        (data ?? {}) as unknown as Record<string, unknown>
      )
      if (!normalized.token?.trim()) {
        throw new Error('Refresh response did not include token')
      }
      authService.storeSession(normalized)
      scheduleSessionTimers(normalized.token)
      setSessionWarningOpen(false)
    } catch {
      await forceLogoutToLogin('Session refresh failed. Please login again.')
    } finally {
      setIsRefreshingSession(false)
    }
  }

  const openSessionWarningModal = () => {
    const expiryMs = expiryAtMsRef.current ?? decodeJwtExpiryMs(authService.getAccessToken() ?? '')
    if (!expiryMs) return
    const left = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000))
    setSecondsLeft(left)
    setSessionWarningOpen(true)
  }

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {}
      return next
    })
  }

  return (
    <div
      className="relative flex h-screen max-h-screen overflow-hidden text-slate-100"
      style={{ width: '100vw', maxWidth: '100vw' }}
    >
      {/* Ambient gradient orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-10 size-72 rounded-full bg-blue-500/20 blur-3xl animate-float-slow" />
        <div
          className="absolute right-0 top-1/3 size-[28rem] rounded-full bg-purple-500/15 blur-3xl animate-float-slow"
          style={{ animationDelay: '3s' }}
        />
        <div
          className="absolute bottom-0 left-1/3 size-80 rounded-full bg-cyan-400/10 blur-3xl animate-float-slow"
          style={{ animationDelay: '6s' }}
        />
      </div>

      <SidebarNav
        userName={userName || ''}
        userAvatarUrl={userAvatarUrl}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopNavbar
          userName={userName || 'User'}
          userAvatarUrl={userAvatarUrl}
          onToggleSidebar={() => setMobileOpen((o) => !o)}
          onSessionIndicatorClick={openSessionWarningModal}
        />

        <div
          ref={scrollWrapperRef}
          className="min-h-0 min-w-0 flex-1 overflow-hidden px-4 py-6 sm:px-6 lg:px-8"
        >
          <div className="min-h-full">{children}</div>
        </div>
      </div>
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
    </div>
  )
}
