import { type ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { RoleSidebar } from './RoleSidebar'
import { SidebarNav } from './SidebarNav'
import { MemberBottomNav } from './MemberBottomNav'
import { useDashboardRoleOrCurrent } from '../../features/auth/DashboardRoleContext'
import { useDashboardSession } from '../../features/auth/DashboardSessionContext'
import { TopNavbar } from './TopNavbar'
import { isDataGridViewportRoute } from '../../lib/dashboardScrollMode'

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
  const { pathname } = useLocation()
  const { openSessionWarning } = useDashboardSession()
  const dashboardRole = useDashboardRoleOrCurrent()
  const lockViewport = isDataGridViewportRoute(pathname)

  const orbClasses =
    dashboardRole === 'trainer'
      ? ['bg-orange-500/20', 'bg-red-500/12', 'bg-amber-400/10']
      : dashboardRole === 'member'
        ? ['bg-orange-500/18', 'bg-amber-500/12', 'bg-neutral-500/8']
        : ['bg-blue-500/20', 'bg-purple-500/15', 'bg-cyan-400/10']

  useEffect(() => {
    document.documentElement.classList.add('dashboard-app')
    document.body.classList.add('dashboard-app')
    return () => {
      document.documentElement.classList.remove('dashboard-app')
      document.body.classList.remove('dashboard-app')
    }
  }, [])

  useEffect(() => {
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
    <div className="relative flex h-dvh max-h-dvh w-full max-w-[100vw] overflow-hidden text-slate-100">
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

      <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden">
        <header className="z-30 shrink-0">
          <TopNavbar
            userName={userName || 'User'}
            userAvatarUrl={userAvatarUrl}
            onToggleSidebar={() => setMobileOpen((o) => !o)}
            onSessionIndicatorClick={openSessionWarning}
          />
        </header>

        <main
          className={[
            'dashboard-scroll-area min-h-0 min-w-0 w-full max-w-full flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8',
            lockViewport ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden',
            dashboardRole === 'member' ? 'pb-20 lg:pb-5' : '',
          ].join(' ')}
        >
          <div
            className={
              lockViewport
                ? 'flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden'
                : 'min-h-min w-full min-w-0 max-w-full'
            }
          >
            {children}
          </div>
        </main>
      </div>
      {dashboardRole === 'member' ? <MemberBottomNav /> : null}
    </div>
  )
}
