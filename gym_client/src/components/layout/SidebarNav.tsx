import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { PermissionGate } from '../auth/PermissionGate'
import {
  canAccessAttendanceNav,
  canAccessConfigNav,
  canAccessPaymentsNav,
  canAccessReportsNav,
  canAccessTrainingNav,
  canAccessUsersNav,
  isStaffFrontDeskOnly,
  STAFF_FRONT_DESK_LINKS,
} from '../../features/auth/navPermissions'
import { linkPrefetchProps, prefetchRoute } from '../../routes/prefetch'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/dashboard/attendance', label: 'Attendance', icon: 'attendance' },
  { path: '/dashboard/payments', label: 'Payments', icon: 'payments' },
  { path: '/dashboard/security', label: 'Security', icon: 'security' },
  { path: '/dashboard/roles', label: 'Roles & Permissions', icon: 'roles' },
  { path: '/dashboard/trainers', label: 'Trainers', icon: 'trainers' },
] as const

const userSubItems = [
  { path: '/dashboard/users', label: 'Users (members)' },
  { path: '/dashboard/user-memberships', label: 'User membership plans' },
  { path: '/dashboard/membership-plans', label: 'Membership plan' },
] as const

const trainingSubItems = [
  { path: '/dashboard/training/body-parts', label: 'Body Parts' },
  { path: '/dashboard/training/exercises', label: 'Exercises' },
  { path: '/dashboard/training/exercises-premium', label: 'Exercises Premium' },
  { path: '/dashboard/training/workout-plan-builder', label: 'Program Builder' },
  { path: '/dashboard/training/workout-studio', label: 'Workout Studio (AI + 3D)' },
  { path: '/dashboard/training/programs', label: 'Programs' },
  { path: '/dashboard/training/workout-assignments', label: 'Workout Assignments' },
] as const

const dietSubItems = [
  { path: '/dashboard/diet-plans', label: 'Dashboard' },
  { path: '/dashboard/diet-plans/list', label: 'All Diet Plans' },
  { path: '/dashboard/diet-plans/assign', label: 'Assign to Users' },
] as const

const gymOpsSubItems = [
  { path: '/dashboard/gym-operations/equipment', label: 'Equipment' },
  { path: '/dashboard/gym-operations/maintenance', label: 'Maintenance Logs' },
  { path: '/dashboard/gym-operations/expenses', label: 'Expenses' },
  { path: '/dashboard/gym-operations/cleaning', label: 'Cleaning & Hygiene' },
  { path: '/dashboard/gym-operations/vendors', label: 'Vendors' },
  { path: '/dashboard/gym-operations/reports', label: 'Reports' },
] as const

const lockerMgmtSubItems = [
  { path: '/dashboard/locker-management/lockers', label: 'Lockers' },
  { path: '/dashboard/locker-management/assignments', label: 'Assignments' },
  { path: '/dashboard/locker-management/access-logs', label: 'Access Logs' },
  { path: '/dashboard/locker-management/maintenance', label: 'Maintenance' },
  { path: '/dashboard/locker-management/reports', label: 'Reports' },
] as const

/** Door / QR entry (scan = all; owner console = ADMIN + STAFF). */
const accessNavItems: ReadonlyArray<{
  path: string
  label: string
  /** When true, visible only to ADMIN + STAFF (owner QR console). */
  requiresQrConsole?: boolean
}> = [
  { path: '/dashboard/access/branches', label: 'Branches', requiresQrConsole: true },
  { path: '/dashboard/access/owner-qr', label: 'Owner QR', requiresQrConsole: true },
  { path: '/dashboard/access/scan', label: 'Scan to enter' },
]

const iconMap = {
  dashboard: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  clients: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  trainers: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  profile: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  payments: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  attendance: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
    </svg>
  ),
  roles: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  security: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 12.5l1.8 1.8 3.2-3.7" />
    </svg>
  ),
  training: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  diet: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  gymOps: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  locker: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16M14.5 10h1.5M14.5 12h1.5" />
    </svg>
  ),
  analytics: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 15l3-3 3 3 5-6" />
    </svg>
  ),
  qrDoor: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17H7a5 5 0 010-10h4M13 17h4a5 5 0 001-9.87M13 17l-4-4 4-4M9 7l4 4-4 4"
      />
    </svg>
  ),
}

interface SidebarNavProps {
  userName?: string | null
  userAvatarUrl?: string | null
  collapsed: boolean
  onToggleCollapse: () => void
  /** Mobile open state (drawer). Desktop ignores this and uses collapsed. */
  mobileOpen?: boolean
  /** Called when user taps overlay / close on mobile */
  onCloseMobile?: () => void
}

export function SidebarNav({
  userName,
  userAvatarUrl,
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: SidebarNavProps) {
  const displayName = userName?.trim() || 'User'
  const location = useLocation()
  const navigate = useNavigate()
  const isUserPath = userSubItems.some(
    (s) => location.pathname === s.path || location.pathname.startsWith(s.path + '/')
  )
  const isTrainingPath = trainingSubItems.some((s) => location.pathname === s.path)
  const isDietPath = dietSubItems.some(
    (s) =>
      location.pathname === s.path ||
      (s.path !== '/dashboard/diet-plans' && location.pathname.startsWith(s.path + '/'))
  )
  const isGymOpsPath = gymOpsSubItems.some(
    (s) => location.pathname === s.path || location.pathname.startsWith(s.path + '/')
  )
  const isLockerMgmtPath = lockerMgmtSubItems.some(
    (s) => location.pathname === s.path || location.pathname.startsWith(s.path + '/')
  )
  const staffFrontDesk = isStaffFrontDeskOnly()
  const visibleAccessNav = accessNavItems.filter(
    (item) => !item.requiresQrConsole || authService.hasQrOwnerAccess(),
  )
  const isAccessPath = visibleAccessNav.some(
    (s) => location.pathname === s.path || location.pathname.startsWith(s.path + '/'),
  )
  const [userOpen, setUserOpen] = useState(isUserPath)
  const [trainingOpen, setTrainingOpen] = useState(isTrainingPath)
  const [dietOpen, setDietOpen] = useState(isDietPath)
  const [gymOpsOpen, setGymOpsOpen] = useState(isGymOpsPath)
  const [lockerMgmtOpen, setLockerMgmtOpen] = useState(isLockerMgmtPath)
  const [accessOpen, setAccessOpen] = useState(isAccessPath)
  const visibleNavItems = navItems.filter((item) => {
    if (item.path === '/dashboard/security') return false
    if (item.path === '/dashboard/attendance') return canAccessAttendanceNav()
    if (item.path === '/dashboard/payments') return canAccessPaymentsNav()
    if (item.path === '/dashboard/roles') return canAccessConfigNav()
    if (item.path === '/dashboard/trainers') return canAccessUsersNav()
    return true
  })
  const staffNavIcon: Record<string, keyof typeof iconMap> = {
    '/dashboard': 'dashboard',
    '/dashboard/reception': 'trainers',
    '/dashboard/attendance': 'attendance',
    '/dashboard/users': 'clients',
    '/dashboard/user-memberships': 'payments',
    '/dashboard/access/scan': 'qrDoor',
  }

  useEffect(() => {
    if (isUserPath) setUserOpen(true)
  }, [isUserPath])
  useEffect(() => {
    if (isTrainingPath) setTrainingOpen(true)
  }, [isTrainingPath])
  useEffect(() => {
    if (isDietPath) setDietOpen(true)
  }, [isDietPath])
  useEffect(() => {
    if (isGymOpsPath) setGymOpsOpen(true)
  }, [isGymOpsPath])
  useEffect(() => {
    if (isLockerMgmtPath) setLockerMgmtOpen(true)
  }, [isLockerMgmtPath])
  useEffect(() => {
    if (isAccessPath) setAccessOpen(true)
  }, [isAccessPath])

  const collapsedAccessHref =
    visibleAccessNav.find((p) => p.path.endsWith('/scan'))?.path ??
    visibleAccessNav[0]?.path ??
    '/dashboard/access/scan'

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // Intentionally ignore API logout failure; local session clear still applies.
    }
    authService.clearSession()
    navigate('/login', { replace: true })
  }

  const activeBase =
    'bg-[linear-gradient(135deg,rgba(59,130,246,0.25),rgba(168,85,247,0.25))] text-white shadow-[0_0_0_1px_rgba(148,163,184,0.12)_inset]'
  const inactiveBase = 'text-slate-300 hover:bg-white/5 hover:text-white'

  const linkClass = (path: string) => {
    const isActive =
      location.pathname === path ||
      // Keep group highlighted on nested pages (e.g. trainer detail)
      (path !== '/dashboard' && location.pathname.startsWith(path + '/'))
    return `group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition ${
      collapsed ? 'justify-center px-2' : 'gap-3 px-3'
    } ${isActive ? activeBase : inactiveBase}`
  }

  const subLinkClass = (path: string) => {
    const isActive = location.pathname === path
    return `rounded-lg py-2 pl-3 pr-2 text-sm transition ${
      isActive
        ? 'bg-white/5 text-white font-medium'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
    }`
  }

  const handleNavClick = () => {
    if (mobileOpen && onCloseMobile) onCloseMobile()
  }

  const sidebarContent = (
    <aside
      className="z-50 flex h-screen shrink-0 flex-col border-r border-white/5 bg-[rgba(7,7,22,0.85)] backdrop-blur-xl transition-[width] duration-300 ease-out"
      style={{
        width: collapsed ? '5rem' : '16rem',
        minWidth: collapsed ? '5rem' : '16rem',
      }}
    >
        {/* ── Brand bar ── */}
        <div className={`flex items-center border-b border-white/[0.06] px-3 py-4 ${collapsed ? 'justify-center px-2' : 'gap-3'}`}>
          {/* Logo mark */}
          <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] text-white shadow-lg shadow-purple-500/30">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 8h2v8H6m10-8h2v8h-2M8 12h8M4 10h2v4H4m14-4h2v4h-2" />
            </svg>
            {/* Pulse dot */}
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate bg-[linear-gradient(135deg,#60a5fa,#c084fc)] bg-clip-text text-sm font-extrabold uppercase tracking-widest text-transparent leading-none">
                PulseFit
              </p>
              <p className="truncate text-[9px] uppercase tracking-[0.2em] text-slate-600 mt-0.5">
                {staffFrontDesk ? 'Front Desk' : 'Admin Suite'}
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle (desktop) */}
        <div className="relative hidden lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="absolute right-0 top-0 z-10 flex size-7 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            style={{ transform: 'translate(50%, -50%)' }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`size-3.5 transition-transform duration-200 ${
                collapsed ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Close button (mobile) */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {!collapsed && (
          <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
            Navigation
          </p>
        )}

        <nav className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 px-3 pb-3">
          {/* Scrollable nav links */}
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {staffFrontDesk ? (
              STAFF_FRONT_DESK_LINKS.filter(
                ({ path }) =>
                  path !== '/dashboard/reception' ||
                  authService.hasPermission('LEADS_CRM') ||
                  authService.hasPermission('LEADS_TRAINER'),
              ).map(({ path, label }) => {
                const icon = staffNavIcon[path] ?? 'dashboard'
                return (
                  <Link
                    key={path}
                    to={path}
                    {...linkPrefetchProps(path)}
                    onClick={handleNavClick}
                    title={collapsed ? label : undefined}
                    className={linkClass(path)}
                  >
                    <span
                      className={
                        location.pathname === path || location.pathname.startsWith(path + '/')
                          ? 'text-white'
                          : 'text-slate-400 group-hover:text-white'
                      }
                    >
                      {iconMap[icon]}
                    </span>
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                )
              })
            ) : (
              <>
            {/* Dashboard first */}
            {visibleNavItems.slice(0, 1).map(({ path, label, icon }) => (
              <Link
                key={path}
                to={path}
                {...linkPrefetchProps(path)}
                onClick={handleNavClick}
                title={collapsed ? label : undefined}
                className={linkClass(path)}
              >
                <span
                  className={
                    location.pathname === path
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-white'
                  }
                >
                  {iconMap[icon]}
                </span>
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            ))}

            {/* Users group */}
            {canAccessUsersNav() &&
            (collapsed ? (
              <Link
                to="/dashboard/users"
                {...linkPrefetchProps('/dashboard/users')}
                onClick={handleNavClick}
                title="User"
                className={`group flex items-center justify-center rounded-xl px-2 py-2.5 text-sm font-medium transition ${
                  isUserPath ? activeBase : inactiveBase
                }`}
              >
                <span
                  className={isUserPath ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                >
                  {iconMap.clients}
                </span>
              </Link>
            ) : (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setUserOpen((o) => !o)}
                  onMouseEnter={() => prefetchRoute('/dashboard/users')}
                  onFocus={() => prefetchRoute('/dashboard/users')}
                  className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-slate-400 group-hover:text-white">
                      {iconMap.clients}
                    </span>
                    <span>Users</span>
                  </span>
                  <svg
                    className={`size-4 shrink-0 text-slate-500 transition-transform ${
                      userOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userOpen && (
                  <div className="ml-4 flex flex-col border-l border-white/10 pl-3">
                    {userSubItems.map(({ path, label }) => (
                      <Link
                        key={path}
                        to={path}
                        {...linkPrefetchProps(path)}
                        onClick={handleNavClick}
                        className={subLinkClass(path)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {(authService.hasPermission('LEADS_CRM') ||
              authService.hasPermission('LEADS_TRAINER')) && (
              <Link
                to="/dashboard/reception"
                {...linkPrefetchProps('/dashboard/reception')}
                onClick={handleNavClick}
                title={collapsed ? 'Lead CRM' : undefined}
                className={linkClass('/dashboard/reception')}
              >
                <span
                  className={
                    location.pathname === '/dashboard/reception' ||
                    location.pathname.startsWith('/dashboard/reception/')
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-white'
                  }
                >
                  {iconMap.trainers}
                </span>
                {!collapsed && <span className="truncate">Lead CRM</span>}
              </Link>
            )}

            {/* Payments, Roles, Trainers */}
            {visibleNavItems.slice(1).map(({ path, label, icon }) => (
              <Link
                key={path}
                to={path}
                {...linkPrefetchProps(path)}
                onClick={handleNavClick}
                title={collapsed ? label : undefined}
                className={linkClass(path)}
              >
                <span
                  className={
                    location.pathname === path
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-white'
                  }
                >
                  {iconMap[icon as keyof typeof iconMap]}
                </span>
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            ))}
            <PermissionGate permission={authService.permissionCodes.reports} fallback={null}>
              {(() => {
                const item = navItems.find((n) => n.path === '/dashboard/security')
                if (!item) return null
                const { path, label, icon } = item
                return (
                  <Link
                    key={path}
                    to={path}
                    {...linkPrefetchProps(path)}
                    onClick={handleNavClick}
                    title={collapsed ? label : undefined}
                    className={linkClass(path)}
                  >
                    <span
                      className={
                        location.pathname === path
                          ? 'text-white'
                          : 'text-slate-400 group-hover:text-white'
                      }
                    >
                      {iconMap[icon]}
                    </span>
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                )
              })()}
            </PermissionGate>

            {/* Training group */}
            {canAccessTrainingNav() &&
            (collapsed ? (
              <Link
                to="/dashboard/training/body-parts"
                {...linkPrefetchProps('/dashboard/training/body-parts')}
                onClick={handleNavClick}
                title="Training"
                className={`group flex items-center justify-center rounded-xl px-2 py-2.5 text-sm font-medium transition ${
                  isTrainingPath ? activeBase : inactiveBase
                }`}
              >
                <span
                  className={
                    isTrainingPath ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }
                >
                  {iconMap.training}
                </span>
              </Link>
            ) : (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setTrainingOpen((o) => !o)}
                  onMouseEnter={() => prefetchRoute('/dashboard/training/body-parts')}
                  onFocus={() => prefetchRoute('/dashboard/training/body-parts')}
                  className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-slate-400 group-hover:text-white">
                      {iconMap.training}
                    </span>
                    <span>Training</span>
                  </span>
                  <svg
                    className={`size-4 shrink-0 text-slate-500 transition-transform ${
                      trainingOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {trainingOpen && (
                  <div className="ml-4 flex flex-col border-l border-white/10 pl-3">
                    {trainingSubItems.map(({ path, label }) => (
                      <Link
                        key={path}
                        to={path}
                        {...linkPrefetchProps(path)}
                        onClick={handleNavClick}
                        className={subLinkClass(path)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Diet group */}
            {canAccessTrainingNav() &&
            (collapsed ? (
              <Link
                to="/dashboard/diet-plans"
                {...linkPrefetchProps('/dashboard/diet-plans')}
                onClick={handleNavClick}
                title="Diet Plans"
                className={`group flex items-center justify-center rounded-xl px-2 py-2.5 text-sm font-medium transition ${
                  isDietPath ? activeBase : inactiveBase
                }`}
              >
                <span
                  className={isDietPath ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                >
                  {iconMap.diet}
                </span>
              </Link>
            ) : (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setDietOpen((o) => !o)}
                  onMouseEnter={() => prefetchRoute('/dashboard/diet-plans')}
                  onFocus={() => prefetchRoute('/dashboard/diet-plans')}
                  className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-slate-400 group-hover:text-white">
                      {iconMap.diet}
                    </span>
                    <span>Diet Plans</span>
                  </span>
                  <svg
                    className={`size-4 shrink-0 text-slate-500 transition-transform ${
                      dietOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dietOpen && (
                  <div className="ml-4 flex flex-col border-l border-white/10 pl-3">
                    {dietSubItems.map(({ path, label }) => (
                      <Link
                        key={path}
                        to={path}
                        {...linkPrefetchProps(path)}
                        onClick={handleNavClick}
                        className={subLinkClass(path)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Gym Operations group (isolated module) */}
            {canAccessReportsNav() &&
            (collapsed ? (
              <Link
                to="/dashboard/gym-operations/equipment"
                {...linkPrefetchProps('/dashboard/gym-operations/equipment')}
                onClick={handleNavClick}
                title="Gym Operations"
                className={`group flex items-center justify-center rounded-xl px-2 py-2.5 text-sm font-medium transition ${
                  isGymOpsPath ? activeBase : inactiveBase
                }`}
              >
                <span
                  className={isGymOpsPath ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                >
                  {iconMap.gymOps}
                </span>
              </Link>
            ) : (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setGymOpsOpen((o) => !o)}
                  onMouseEnter={() => prefetchRoute('/dashboard/gym-operations/equipment')}
                  onFocus={() => prefetchRoute('/dashboard/gym-operations/equipment')}
                  className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-slate-400 group-hover:text-white">
                      {iconMap.gymOps}
                    </span>
                    <span>Gym Operations</span>
                  </span>
                  <svg
                    className={`size-4 shrink-0 text-slate-500 transition-transform ${
                      gymOpsOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {gymOpsOpen && (
                  <div className="ml-4 flex flex-col border-l border-white/10 pl-3">
                    {gymOpsSubItems.map(({ path, label }) => (
                      <Link
                        key={path}
                        to={path}
                        {...linkPrefetchProps(path)}
                        onClick={handleNavClick}
                        className={subLinkClass(path)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Locker Management group (isolated module) */}
            {canAccessConfigNav() &&
            (collapsed ? (
              <Link
                to="/dashboard/locker-management/lockers"
                {...linkPrefetchProps('/dashboard/locker-management/lockers')}
                onClick={handleNavClick}
                title="Locker Management"
                className={`group flex items-center justify-center rounded-xl px-2 py-2.5 text-sm font-medium transition ${
                  isLockerMgmtPath ? activeBase : inactiveBase
                }`}
              >
                <span
                  className={isLockerMgmtPath ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                >
                  {iconMap.locker}
                </span>
              </Link>
            ) : (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setLockerMgmtOpen((o) => !o)}
                  onMouseEnter={() => prefetchRoute('/dashboard/locker-management/lockers')}
                  onFocus={() => prefetchRoute('/dashboard/locker-management/lockers')}
                  className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-slate-400 group-hover:text-white">
                      {iconMap.locker}
                    </span>
                    <span>Locker Management</span>
                  </span>
                  <svg
                    className={`size-4 shrink-0 text-slate-500 transition-transform ${
                      lockerMgmtOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {lockerMgmtOpen && (
                  <div className="ml-4 flex flex-col border-l border-white/10 pl-3">
                    {lockerMgmtSubItems.map(({ path, label }) => (
                      <Link
                        key={path}
                        to={path}
                        {...linkPrefetchProps(path)}
                        onClick={handleNavClick}
                        className={subLinkClass(path)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Door / QR entry */}
            {collapsed ? (
              <Link
                to={collapsedAccessHref}
                {...linkPrefetchProps(collapsedAccessHref)}
                onClick={handleNavClick}
                title="Access & QR"
                className={`group flex items-center justify-center rounded-xl px-2 py-2.5 text-sm font-medium transition ${
                  isAccessPath ? activeBase : inactiveBase
                }`}
              >
                <span
                  className={
                    isAccessPath ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }
                >
                  {iconMap.qrDoor}
                </span>
              </Link>
            ) : (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setAccessOpen((o) => !o)}
                  onMouseEnter={() => prefetchRoute(collapsedAccessHref)}
                  onFocus={() => prefetchRoute(collapsedAccessHref)}
                  className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-slate-400 group-hover:text-white">
                      {iconMap.qrDoor}
                    </span>
                    <span>Access</span>
                  </span>
                  <svg
                    className={`size-4 shrink-0 text-slate-500 transition-transform ${
                      accessOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {accessOpen && (
                  <div className="ml-4 flex flex-col border-l border-white/10 pl-3">
                    {visibleAccessNav.map(({ path, label }) => (
                      <Link
                        key={path}
                        to={path}
                        {...linkPrefetchProps(path)}
                        onClick={handleNavClick}
                        className={subLinkClass(path)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Owner Analytics (isolated module, single page with drill-down drawer) */}
            {canAccessReportsNav() && (
              <Link
                to="/dashboard/owner-analytics"
                {...linkPrefetchProps('/dashboard/owner-analytics')}
                onClick={handleNavClick}
                title={collapsed ? 'Owner Analytics' : undefined}
                className={linkClass('/dashboard/owner-analytics')}
              >
                <span
                  className={
                    location.pathname === '/dashboard/owner-analytics'
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-white'
                  }
                >
                  {iconMap.analytics}
                </span>
                {!collapsed && <span className="truncate">Owner Analytics</span>}
              </Link>
            )}
              </>
            )}
          </div>

          {/* Bottom: Help Center + Profile + Logout */}
          <div className="mt-2 flex shrink-0 flex-col gap-1 border-t border-white/5 pt-3">
            <Link
              to="/help"
              {...linkPrefetchProps('/help')}
              onClick={handleNavClick}
              title={collapsed ? 'Help Center' : undefined}
              className={linkClass('/help')}
            >
              <span
                className={
                  location.pathname.startsWith('/help')
                    ? 'text-white'
                    : 'text-slate-400 group-hover:text-white'
                }
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </span>
              {!collapsed && <span>Help Center</span>}
            </Link>
            <Link
              to="/dashboard/profile"
              {...linkPrefetchProps('/dashboard/profile')}
              onClick={handleNavClick}
              title={collapsed ? 'Profile' : undefined}
              className={linkClass('/dashboard/profile')}
            >
              <span
                className={
                  location.pathname === '/dashboard/profile'
                    ? 'text-white'
                    : 'text-slate-400 group-hover:text-white'
                }
              >
                {iconMap.profile}
              </span>
              {!collapsed && <span>Profile</span>}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title={collapsed ? 'Logout' : undefined}
              className={`group flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-slate-300 transition hover:bg-pink-500/10 hover:text-pink-300 ${
                collapsed ? 'justify-center px-2' : 'gap-3 px-3'
              }`}
            >
              <svg
                className="size-5 shrink-0 text-slate-400 group-hover:text-pink-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1z" />
              </svg>
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </nav>
    </aside>
  )

  return (
    <>
      <div className="hidden h-full shrink-0 lg:flex">{sidebarContent}</div>
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">{sidebarContent}</div>
        </>
      )}
    </>
  )
}
