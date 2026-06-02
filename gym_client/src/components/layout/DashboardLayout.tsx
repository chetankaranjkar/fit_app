import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import LocomotiveScroll from 'locomotive-scroll'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RoleSidebar } from './RoleSidebar'
import { SidebarNav } from './SidebarNav'
import { MemberBottomNav } from './MemberBottomNav'
import { useDashboardRoleOrCurrent } from '../../features/auth/DashboardRoleContext'
import { useDashboardSession } from '../../features/auth/DashboardSessionContext'
import { TopNavbar } from './TopNavbar'
import { setupScrollTrigger, cleanupScrollTrigger } from '../../lib/animations/gsapSetup'
import { setLocomotiveScrollInstance } from '../../lib/scrollInstance'

const SIDEBAR_COLLAPSED_KEY = 'gym-sidebar-collapsed'

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
  const scrollWrapperRef = useRef<HTMLDivElement>(null)
  const scrollInstanceRef = useRef<LocomotiveScroll | null>(null)
  const { pathname } = useLocation()
  const { openSessionWarning } = useDashboardSession()
  const dashboardRole = useDashboardRoleOrCurrent()

  const orbClasses =
    dashboardRole === 'trainer'
      ? ['bg-orange-500/20', 'bg-red-500/12', 'bg-amber-400/10']
      : dashboardRole === 'member'
        ? ['bg-orange-500/18', 'bg-amber-500/12', 'bg-neutral-500/8']
        : ['bg-blue-500/20', 'bg-purple-500/15', 'bg-cyan-400/10']

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
    setMobileOpen(false)
  }, [pathname])

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
          onSessionIndicatorClick={openSessionWarning}
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
    </div>
  )
}
