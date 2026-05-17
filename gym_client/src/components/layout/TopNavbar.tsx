import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authService } from '../../services/auth.service'
import { useDashboardRoleOrCurrent } from '../../features/auth/DashboardRoleContext'
import { dashboardService } from '../../services/dashboard.service'
import { meService } from '../../services/me.service'
import type { MeNotification } from '../../services/me.service'
import type { DashboardAlert } from '../../services/dashboard.service'

interface TopNavbarProps {
  userName: string
  userAvatarUrl?: string | null
  onToggleSidebar?: () => void
  onSessionIndicatorClick?: () => void
  /** Optional title shown left-side on small screens (sidebar collapses) */
  title?: string
}

/**
 * Glassmorphic top navigation bar.
 * - Mobile: includes hamburger to toggle the sidebar
 * - Desktop: search, notifications, user chip
 */
export function TopNavbar({
  userName,
  userAvatarUrl,
  onToggleSidebar,
  onSessionIndicatorClick,
  title = 'Dashboard',
}: TopNavbarProps) {
  const navigate = useNavigate()
  const dashboardRole = useDashboardRoleOrCurrent()
  const notificationsRef = useRef<HTMLDivElement>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [expiryLabel, setExpiryLabel] = useState<string | null>(null)
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    const decodeExpiry = (token: string): number | null => {
      try {
        const parts = token.split('.')
        if (parts.length < 2) return null
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const padded = payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, '=')
        const payload = JSON.parse(window.atob(padded)) as { exp?: number }
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null
      } catch {
        return null
      }
    }

    const updateStatus = () => {
      const token = authService.getAccessToken()
      if (!token) {
        setExpiryLabel(null)
        setIsExpiringSoon(false)
        return
      }
      const expiryMs = decodeExpiry(token)
      if (!expiryMs) {
        setExpiryLabel(null)
        setIsExpiringSoon(false)
        return
      }
      const now = Date.now()
      const leftMs = expiryMs - now
      const expiringSoon = leftMs > 0 && leftMs <= 2 * 60 * 1000
      setIsExpiringSoon(expiringSoon)
      const formatted = new Date(expiryMs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      setExpiryLabel(formatted)
    }

    updateStatus()
    const intervalId = window.setInterval(updateStatus, 15000)
    return () => window.clearInterval(intervalId)
  }, [])

  const { data: meDashData, isLoading: meNotificationsLoading } = useQuery({
    queryKey: ['top-navbar-me-dashboard'],
    queryFn: async () => {
      const { data } = await meService.getDashboard()
      return data
    },
    enabled: dashboardRole === 'member',
    staleTime: 120_000,
    retry: 1,
  })

  const { data: staffNotifData, isLoading: staffNotificationsLoading } = useQuery({
    queryKey: ['top-navbar-staff-dashboard-notifications'],
    queryFn: async () => {
      try {
        const { data } = await dashboardService.getNotifications()
        return data
      } catch {
        return { alerts: [] as DashboardAlert[], hooks: { emailEnabled: false, whatsAppEnabled: false } }
      }
    },
    enabled: dashboardRole === 'admin' || dashboardRole === 'trainer',
    staleTime: 120_000,
    retry: false,
  })

  const memberNotifications: MeNotification[] = meDashData?.recentNotifications ?? []
  const staffAlerts: DashboardAlert[] = staffNotifData?.alerts ?? []
  const unreadMemberCount = memberNotifications.filter((n) => !n.isRead).length
  const hasStaffAlerts = staffAlerts.length > 0
  const showNotificationDot =
    dashboardRole === 'member' ? unreadMemberCount > 0 : hasStaffAlerts

  useEffect(() => {
    if (!notificationsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotificationsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [notificationsOpen])

  useEffect(() => {
    if (!notificationsOpen) return
    const onDocMouseDown = (e: MouseEvent) => {
      const root = notificationsRef.current
      if (!root || !(e.target instanceof Node) || root.contains(e.target)) return
      setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [notificationsOpen])

  const handleNewMember = () => {
    try {
      sessionStorage.setItem('gym_openAddMember', '1')
    } catch {
      /* ignore storage blocked */
    }
    navigate('/dashboard/users', { state: { openAddMember: true } })
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-[rgba(11,11,26,0.55)] px-4 backdrop-blur-xl sm:px-6"
      role="banner"
    >
      {/* Mobile hamburger */}
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex size-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Title (mobile only — keeps desktop airy) */}
      <h1 className="truncate text-base font-semibold text-white lg:hidden">{title}</h1>

      {/* Search */}
      <div className="ml-2 hidden max-w-sm flex-1 md:flex">
        <div className="group relative w-full">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 group-focus-within:text-blue-300">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search members, trainers, plans…"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 transition focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {expiryLabel && (
          <button
            type="button"
            onClick={onSessionIndicatorClick}
            className={`hidden rounded-xl border px-3 py-1.5 text-[11px] font-medium md:block ${
              isExpiringSoon
                ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
            } transition hover:brightness-110`}
            title="Current session expiry (click to extend)"
          >
            Active until {expiryLabel}
          </button>
        )}
        {/* Quick action: New (staff-facing members list) */}
        {dashboardRole !== 'member' && (
          <button
            type="button"
            onClick={handleNewMember}
            className="hidden items-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:brightness-110 sm:inline-flex"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Member
          </button>
        )}

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((o) => !o)}
            className={`relative inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white ${notificationsOpen ? 'ring-2 ring-blue-400/35' : ''}`}
            aria-expanded={notificationsOpen}
            aria-label="Notifications"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0a3 3 0 11-6 0" />
            </svg>
            {showNotificationDot ? (
              <span className="absolute right-1.5 top-1.5 flex size-2 items-center justify-center">
                <span className="absolute inline-flex size-2.5 animate-ping rounded-full bg-pink-400 opacity-40" aria-hidden />
                <span className="relative inline-flex size-2 rounded-full bg-pink-500 ring-2 ring-[rgba(11,11,26,0.9)]" />
              </span>
            ) : null}
          </button>

          {notificationsOpen ? (
            <div
              role="dialog"
              aria-label="Notifications"
              className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.97)] shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-sm font-semibold text-white">Notifications</p>
                <p className="text-[11px] text-slate-400">
                  {dashboardRole === 'member'
                    ? 'Updates tied to your membership and workouts.'
                    : 'Gym alerts and operational summaries.'}
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {dashboardRole === 'member' ? (
                  memberNotificationsLoading ? (
                    <p className="px-3 py-6 text-center text-sm text-slate-400">Loading…</p>
                  ) : memberNotifications.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-slate-500">
                      You&apos;re all caught up.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {memberNotifications.map((n) => (
                        <li
                          key={n.id}
                          className={`rounded-xl border px-3 py-2.5 text-left ${
                            n.isRead
                              ? 'border-transparent bg-white/[0.03]'
                              : 'border-blue-400/25 bg-blue-500/10'
                          }`}
                        >
                          <p className="text-xs font-semibold text-white">{n.title}</p>
                          <p className="mt-0.5 text-xs leading-snug text-slate-300">{n.message}</p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )
                ) : staffNotificationsLoading ? (
                  <p className="px-3 py-6 text-center text-sm text-slate-400">Loading…</p>
                ) : staffAlerts.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-slate-500">
                    No alerts right now.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {staffAlerts.map((alert, idx) => (
                      <li
                        key={`${alert.type}-${alert.title}-${idx}`}
                        className={`rounded-xl border px-3 py-2.5 text-left ${
                          alert.severity === 'danger'
                            ? 'border-rose-500/30 bg-rose-500/10'
                            : alert.severity === 'warning'
                              ? 'border-amber-500/25 bg-amber-500/10'
                              : 'border-white/10 bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-white">{alert.title}</p>
                          {alert.count > 1 ? (
                            <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">
                              {alert.count}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-snug text-slate-300">{alert.message}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                          {alert.type} · {alert.severity}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Settings */}
        <button
          type="button"
          onClick={() => navigate('/dashboard/profile')}
          className="hidden size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white sm:inline-flex"
          aria-label="Settings"
        >
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.591 1.07 1.724 1.724 0 012.37 2.37 1.724 1.724 0 001.07 2.59 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.07 2.591 1.724 1.724 0 01-2.37 2.37 1.724 1.724 0 00-2.591 1.07 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.59-1.07 1.724 1.724 0 01-2.37-2.37 1.724 1.724 0 00-1.07-2.591 1.724 1.724 0 010-3.35 1.724 1.724 0 001.07-2.59 1.724 1.724 0 012.37-2.37 1.724 1.724 0 002.59-1.07z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* User chip */}
        <button
          type="button"
          onClick={() => navigate('/dashboard/profile')}
          className="ml-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-left transition hover:bg-white/10"
        >
          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-[11px] font-bold text-white">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials || 'U'
            )}
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="max-w-[10rem] truncate text-xs font-semibold text-white">
              {userName}
            </span>
            <span className="text-[10px] text-slate-400">Administrator</span>
          </span>
        </button>
      </div>
    </header>
  )
}
