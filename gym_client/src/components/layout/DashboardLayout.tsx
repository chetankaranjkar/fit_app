import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LocomotiveScroll from 'locomotive-scroll'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RoleSidebar } from './RoleSidebar'
import { SidebarNav } from './SidebarNav'
import { MemberBottomNav } from './MemberBottomNav'
import { useDashboardRoleOrCurrent } from '../../features/auth/DashboardRoleContext'
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
  const dashboardRole = useDashboardRoleOrCurrent()

  const orbClasses =
    dashboardRole === 'trainer'
      ? ['bg-orange-500/20', 'bg-red-500/12', 'bg-amber-400/10']
      : dashboardRole === 'member'
        ? ['bg-orange-500/18', 'bg-amber-500/12', 'bg-neutral-500/8']
        : ['bg-blue-500/20', 'bg-purple-500/15', 'bg-cyan-400/10']

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
    if (authService.isAccessTokenValid()) {
      try {
        await authService.logout()
      } catch {
        // Ignore API failure and proceed with local cleanup.
      }
    }
    authService.setSessionExpiredMessage(message)
    authService.clearSession()
    navigate('/login', { replace: true })
  }

  const refreshSessionAndReschedule = async (): Promise<boolean> => {
    const refreshToken = authService.getRefreshToken()
    if (!refreshToken) return false
    try {
      const { data } = await authService.refresh(refreshToken)
      const normalized = authService.normalizeLoginResponse(
        (data ?? {}) as unknown as Record<string, unknown>
      )
      if (!normalized.token?.trim()) return false
      authService.storeSession(normalized)
      scheduleSessionTimers(normalized.token)
      return true
    } catch {
      return false
    }
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
    const msUntilExpiry = expiryMs - now

    // Expired or about to expire — refresh instead of immediate logout (avoids setTimeout(0) flash)
    if (msUntilExpiry <= SESSION_WARNING_LEAD_SECONDS * 1000) {
      void (async () => {
        const refreshed = await refreshSessionAndReschedule()
        if (!refreshed) {
          await forceLogoutToLogin('Your session expired. Please login again.')
        }
      })()
      return
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
  }

  useEffect(() => {
    const wrapper = scrollWrapperRef.current
    if (!wrapper) return
    const content = wrapper.firstElementChild as HTMLElement | null
    if (!content) return

    const desktopMq = window.matchMedia('(min-width: 1024px)')

    const enableNativeScroll = () => {
      wrapper.style.overflowY = 'auto'
      wrapper.style.overflowX = 'hidden'
      wrapper.style.webkitOverflowScrolling = 'touch'
    }

    const disableNativeScroll = () => {
      wrapper.style.overflowY = ''
      wrapper.style.overflowX = ''
      wrapper.style.webkitOverflowScrolling = ''
    }

    const initSmoothScroll = () => {
      if (!desktopMq.matches) {
        enableNativeScroll()
        return undefined
      }

      disableNativeScroll()
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

      const refreshId = window.setTimeout(() => {
        ScrollTrigger.refresh()
      }, 200)

      return () => {
        window.clearTimeout(refreshId)
        cleanupScrollTrigger()
        locomotiveScroll.destroy()
        setLocomotiveScrollInstance(null)
        scrollInstanceRef.current = null
        enableNativeScroll()
      }
    }

    let teardown = initSmoothScroll()

    const onBreakpointChange = () => {
      teardown?.()
      teardown = initSmoothScroll()
    }

    desktopMq.addEventListener('change', onBreakpointChange)

    return () => {
      desktopMq.removeEventListener('change', onBreakpointChange)
      teardown?.()
      enableNativeScroll()
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
    // Do not re-run on route change — remounting layout per page already resets timers; pathname here caused refresh/logout flashes on Profile.
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
      const refreshed = await refreshSessionAndReschedule()
      if (!refreshed) {
        throw new Error('Refresh response did not include token')
      }
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
    <div className="relative flex h-screen max-h-dvh w-full max-w-full overflow-hidden text-slate-100">
      {/* Ambient gradient orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className={`absolute -top-32 left-10 size-72 rounded-full blur-3xl animate-float-slow ${orbClasses[0]}`} />
        <div
          className={`absolute right-0 top-1/3 size-[28rem] rounded-full blur-3xl animate-float-slow ${orbClasses[1]}`}
          style={{ animationDelay: '3s' }}
        />
        <div
          className={`absolute bottom-0 left-1/3 size-80 rounded-full blur-3xl animate-float-slow ${orbClasses[2]}`}
          style={{ animationDelay: '6s' }}
        />
      </div>

      {dashboardRole === 'admin' ? (
        <SidebarNav
          userName={userName || ''}
          userAvatarUrl={userAvatarUrl}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      ) : (
        <RoleSidebar
          userName={userName || ''}
          userAvatarUrl={userAvatarUrl}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          hideOnMobile={dashboardRole === 'member'}
        />
      )}

      <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">
        <TopNavbar
          userName={userName || 'User'}
          userAvatarUrl={userAvatarUrl}
          onToggleSidebar={() => setMobileOpen((o) => !o)}
          onSessionIndicatorClick={openSessionWarningModal}
        />

        <div
          ref={scrollWrapperRef}
          className={[
            'dashboard-scroll-area min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 lg:overflow-hidden lg:px-8',
            dashboardRole === 'member' ? 'pb-24 lg:pb-6' : '',
          ].join(' ')}
        >
          <div className="min-h-full">{children}</div>
        </div>
      </div>
      {dashboardRole === 'member' ? <MemberBottomNav /> : null}
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
