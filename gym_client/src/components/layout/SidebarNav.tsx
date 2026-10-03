import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import {
  canAccessAttendanceNav,
  canAccessConfigNav,
  canAccessLeadsNav,
  canAccessPaymentsNav,
  canAccessReportsNav,
  canAccessTrainingNav,
  canAccessPtNav,
  canAccessUsersNav,
  isStaffFrontDeskOnly,
  getStaffFrontDeskNavLinks,
} from '../../features/auth/navPermissions'
import { getTrainingNavNodes, pruneTrainingNavNodes } from '../../features/auth/trainingNav'
import { groupBySection, type NavSectionId } from '../../features/auth/navSections'
import { linkPrefetchProps, prefetchRoute } from '../../routes/prefetch'
import { BrandLogo } from '../brand/BrandLogo'
import { SidebarSectionHeading } from './SidebarSectionHeading'

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
  memberships: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
    </svg>
  ),
  plans: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
  coupons: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  retail: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  notifications: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
}

type IconKey = keyof typeof iconMap

type AdminNavChild =
  | { kind?: 'link'; path: string; label: string; visible?: () => boolean }
  | { kind: 'heading'; label: string }

type AdminNavEntry =
  | {
      kind: 'link'
      section: NavSectionId
      path: string
      label: string
      icon: IconKey
      visible?: () => boolean
    }
  | {
      kind: 'group'
      section: NavSectionId
      id: string
      label: string
      icon: IconKey
      /** Collapsed-rail target; defaults to the first visible child. */
      collapsedHref?: string
      children: readonly AdminNavChild[]
      visible?: () => boolean
    }

/** Owner/admin sidebar. URLs and visibility checks are the route contract — keep them stable. */
const ADMIN_NAV: readonly AdminNavEntry[] = [
  { kind: 'link', section: 'overview', path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },

  { kind: 'link', section: 'members', path: '/dashboard/users', label: 'Members', icon: 'clients', visible: canAccessUsersNav },
  { kind: 'link', section: 'members', path: '/dashboard/reception', label: 'Lead CRM', icon: 'trainers', visible: canAccessLeadsNav },

  { kind: 'link', section: 'billing', path: '/dashboard/user-memberships', label: 'Memberships', icon: 'memberships', visible: canAccessUsersNav },
  { kind: 'link', section: 'billing', path: '/dashboard/membership-plans', label: 'Plan catalog', icon: 'plans', visible: canAccessUsersNav },
  { kind: 'link', section: 'billing', path: '/dashboard/payments', label: 'Payments', icon: 'payments', visible: canAccessPaymentsNav },
  { kind: 'link', section: 'billing', path: '/dashboard/coupons', label: 'Coupons', icon: 'coupons', visible: canAccessPaymentsNav },

  { kind: 'link', section: 'coaching', path: '/dashboard/trainers', label: 'Trainers', icon: 'trainers', visible: canAccessUsersNav },
  {
    kind: 'group',
    section: 'coaching',
    id: 'training',
    label: 'Training',
    icon: 'training',
    visible: canAccessTrainingNav,
    collapsedHref: '/dashboard/training/programs',
    children: getTrainingNavNodes({ includeMonitor: true }),
  },
  {
    kind: 'group',
    section: 'coaching',
    id: 'diet',
    label: 'Diet Plans',
    icon: 'diet',
    visible: canAccessTrainingNav,
    children: [
      { path: '/dashboard/diet-plans', label: 'Dashboard' },
      { path: '/dashboard/diet-plans/list', label: 'All Diet Plans' },
      { path: '/dashboard/diet-plans/assign', label: 'Assign to Members' },
      { path: '/dashboard/supplements/master', label: 'Supplement Catalog' },
    ],
  },
  {
    kind: 'group',
    section: 'coaching',
    id: 'pt',
    label: 'Personal Training',
    icon: 'trainers',
    visible: canAccessPtNav,
    children: [
      { path: '/dashboard/personal-training', label: 'Dashboard' },
      { path: '/dashboard/personal-training/packages', label: 'PT Packages' },
      { path: '/dashboard/personal-training/assign', label: 'Assign Package' },
      { path: '/dashboard/personal-training/sessions', label: 'Sessions' },
      { path: '/dashboard/personal-training/reports', label: 'Reports' },
    ],
  },

  { kind: 'link', section: 'attendance', path: '/dashboard/attendance', label: 'Attendance', icon: 'attendance', visible: canAccessAttendanceNav },
  {
    kind: 'group',
    section: 'attendance',
    id: 'access',
    label: 'Access & QR',
    icon: 'qrDoor',
    collapsedHref: '/dashboard/access/scan',
    children: [
      { path: '/dashboard/access/scan', label: 'Scan to enter' },
      { path: '/dashboard/access/branches', label: 'Branches', visible: authService.hasQrOwnerAccess },
      { path: '/dashboard/access/owner-qr', label: 'Owner QR', visible: authService.hasQrOwnerAccess },
    ],
  },

  {
    kind: 'group',
    section: 'retail',
    id: 'retail',
    label: 'Store',
    icon: 'retail',
    visible: canAccessPaymentsNav,
    children: [
      { path: '/dashboard/retail/pos', label: 'POS Checkout' },
      { path: '/dashboard/retail/orders', label: 'Orders / Sales' },
      { path: '/dashboard/retail/products', label: 'Products' },
      { path: '/dashboard/retail/categories', label: 'Categories' },
      { path: '/dashboard/retail/alerts', label: 'Stock Alerts' },
    ],
  },

  {
    kind: 'group',
    section: 'operations',
    id: 'gymOps',
    label: 'Facilities',
    icon: 'gymOps',
    visible: canAccessReportsNav,
    children: [
      { path: '/dashboard/gym-operations/equipment', label: 'Equipment' },
      { path: '/dashboard/gym-operations/maintenance', label: 'Maintenance Logs' },
      { path: '/dashboard/gym-operations/cleaning', label: 'Cleaning & Hygiene' },
      { path: '/dashboard/gym-operations/expenses', label: 'Expenses' },
      { path: '/dashboard/gym-operations/vendors', label: 'Vendors' },
      { path: '/dashboard/gym-operations/reports', label: 'Reports' },
    ],
  },
  {
    kind: 'group',
    section: 'operations',
    id: 'lockers',
    label: 'Lockers',
    icon: 'locker',
    visible: canAccessConfigNav,
    children: [
      { path: '/dashboard/locker-management/lockers', label: 'Lockers' },
      { path: '/dashboard/locker-management/assignments', label: 'Assignments' },
      { path: '/dashboard/locker-management/access-logs', label: 'Access Logs' },
      { path: '/dashboard/locker-management/maintenance', label: 'Maintenance' },
      { path: '/dashboard/locker-management/reports', label: 'Reports' },
    ],
  },

  { kind: 'link', section: 'reports', path: '/dashboard/owner-analytics', label: 'Owner Analytics', icon: 'analytics', visible: canAccessReportsNav },
  { kind: 'link', section: 'reports', path: '/dashboard/security', label: 'Security & sessions', icon: 'security', visible: authService.canReportsAccess },

  { kind: 'link', section: 'settings', path: '/dashboard/roles', label: 'Roles & Permissions', icon: 'roles', visible: canAccessConfigNav },
  {
    kind: 'group',
    section: 'settings',
    id: 'notifications',
    label: 'Notifications',
    icon: 'notifications',
    visible: canAccessConfigNav,
    children: [
      { path: '/dashboard/settings/notifications', label: 'Channel status' },
      { path: '/dashboard/settings/email', label: 'Email settings' },
      { path: '/dashboard/settings/sms', label: 'SMS settings' },
      { path: '/dashboard/settings/notification-templates', label: 'Notification templates' },
      { path: '/dashboard/settings/invoice-branding', label: 'Invoice branding' },
    ],
  },
]

const staffNavIcon: Record<string, IconKey> = {
  '/dashboard': 'dashboard',
  '/dashboard/reception': 'trainers',
  '/dashboard/attendance': 'attendance',
  '/dashboard/users': 'clients',
  '/dashboard/user-memberships': 'memberships',
  '/dashboard/payments/collect': 'payments',
  '/dashboard/access/scan': 'qrDoor',
}

/** Visible entries for the signed-in user; groups keep only visible children and drop when empty. */
function getVisibleAdminNav(): AdminNavEntry[] {
  const visible: AdminNavEntry[] = []
  for (const entry of ADMIN_NAV) {
    if (entry.visible && !entry.visible()) continue
    if (entry.kind === 'link') {
      visible.push(entry)
      continue
    }
    const children = pruneTrainingNavNodes(
      entry.children.filter((c) => c.kind === 'heading' || !c.visible || c.visible()),
    )
    if (children.length > 0) visible.push({ ...entry, children })
  }
  return visible
}

function getFrontDeskNav(): AdminNavEntry[] {
  return getStaffFrontDeskNavLinks().map(({ path, label, section }) => ({
    kind: 'link',
    section,
    path,
    label,
    icon: staffNavIcon[path] ?? 'dashboard',
  }))
}

function matchesPath(pathname: string, path: string): boolean {
  return pathname === path || (path !== '/dashboard' && pathname.startsWith(path + '/'))
}

function isGroupActive(pathname: string, children: readonly AdminNavChild[]): boolean {
  return children.some((c) => c.kind !== 'heading' && 'path' in c && matchesPath(pathname, c.path))
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
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: SidebarNavProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location
  const staffFrontDesk = isStaffFrontDeskOnly()
  const entries = staffFrontDesk ? getFrontDeskNav() : getVisibleAdminNav()
  const sections = groupBySection(entries)
  const groups = entries.filter(
    (e): e is Extract<AdminNavEntry, { kind: 'group' }> => e.kind === 'group',
  )

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of groups) init[g.id] = isGroupActive(pathname, g.children)
    return init
  })

  useEffect(() => {
    for (const g of groups) {
      if (isGroupActive(pathname, g.children)) {
        setOpenGroups((prev) => (prev[g.id] ? prev : { ...prev, [g.id]: true }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- groups derive from session; re-run on navigation only
  }, [pathname])

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
    const isActive = matchesPath(pathname, path)
    return `group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition ${
      collapsed ? 'justify-center px-2' : 'gap-3 px-3'
    } ${isActive ? activeBase : inactiveBase}`
  }

  const subLinkClass = (path: string) => {
    const isActive = pathname === path
    return `rounded-lg py-2 pl-3 pr-2 text-sm transition ${
      isActive
        ? 'bg-white/5 text-white font-medium'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
    }`
  }

  const iconClass = (active: boolean) => (active ? 'text-white' : 'text-slate-400 group-hover:text-white')

  const handleNavClick = () => {
    if (mobileOpen && onCloseMobile) onCloseMobile()
  }

  const renderEntry = (entry: AdminNavEntry) => {
    if (entry.kind === 'link') {
      const { path, label, icon } = entry
      return (
        <Link
          key={path}
          to={path}
          {...linkPrefetchProps(path)}
          onClick={handleNavClick}
          title={collapsed ? label : undefined}
          aria-label={collapsed ? label : undefined}
          aria-current={matchesPath(pathname, path) ? 'page' : undefined}
          className={linkClass(path)}
        >
          <span className={iconClass(matchesPath(pathname, path))}>{iconMap[icon]}</span>
          {!collapsed && <span className="truncate">{label}</span>}
        </Link>
      )
    }

    const active = isGroupActive(pathname, entry.children)
    const firstLink = entry.children.find((c): c is Extract<AdminNavChild, { path: string }> =>
      Boolean(c.kind !== 'heading' && 'path' in c),
    )
    const href = entry.collapsedHref ?? firstLink?.path ?? '/dashboard'

    if (collapsed) {
      return (
        <Link
          key={entry.id}
          to={href}
          {...linkPrefetchProps(href)}
          onClick={handleNavClick}
          title={entry.label}
          aria-label={entry.label}
          className={`group flex items-center justify-center rounded-xl px-2 py-2.5 text-sm font-medium transition ${
            active ? activeBase : inactiveBase
          }`}
        >
          <span className={iconClass(active)}>{iconMap[entry.icon]}</span>
        </Link>
      )
    }

    const open = openGroups[entry.id] ?? false
    return (
      <div key={entry.id} className="flex flex-col gap-0.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`sidebar-group-${entry.id}`}
          onClick={() => setOpenGroups((p) => ({ ...p, [entry.id]: !open }))}
          onMouseEnter={() => prefetchRoute(href)}
          onFocus={() => prefetchRoute(href)}
          className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
        >
          <span className="flex items-center gap-3">
            <span className="text-slate-400 group-hover:text-white">{iconMap[entry.icon]}</span>
            <span>{entry.label}</span>
          </span>
          <svg
            className={`size-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div id={`sidebar-group-${entry.id}`} className="ml-4 flex flex-col border-l border-white/10 pl-3">
            {entry.children.map((child) =>
              child.kind === 'heading' ? (
                <p
                  key={`heading-${child.label}`}
                  className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                >
                  {child.label}
                </p>
              ) : (
                <Link
                  key={child.path}
                  to={child.path}
                  {...linkPrefetchProps(child.path)}
                  onClick={handleNavClick}
                  className={subLinkClass(child.path)}
                >
                  {child.label}
                </Link>
              ),
            )}
          </div>
        )}
      </div>
    )
  }

  const sidebarContent = (
    <aside
      id={mobileOpen ? 'dashboard-mobile-nav' : undefined}
      className="z-50 flex h-screen shrink-0 flex-col border-r border-white/5 bg-[rgba(7,7,22,0.85)] backdrop-blur-xl transition-[width] duration-300 ease-out"
      style={{
        width: collapsed ? '5rem' : '16rem',
        minWidth: collapsed ? '5rem' : '16rem',
      }}
    >
        {/* ── Brand bar ── */}
        <div className={`flex items-center border-b border-white/[0.06] px-3 py-4 ${collapsed ? 'justify-center px-2' : 'gap-3'}`}>
          <BrandLogo
            to="/dashboard"
            collapsed={collapsed}
            size={collapsed ? 40 : 44}
            showSubtitle={collapsed ? undefined : staffFrontDesk ? 'Front Desk' : 'Admin Suite'}
          />
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

        <nav className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 px-3 pb-3" aria-label="Main navigation">
          {/* Scrollable nav links */}
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {sections.map((bucket, index) => (
              <div key={bucket.id ?? 'flat'} className="flex flex-col gap-1">
                {bucket.label ? (
                  <SidebarSectionHeading label={bucket.label} collapsed={collapsed} first={index === 0} />
                ) : null}
                {bucket.entries.map(renderEntry)}
              </div>
            ))}
          </div>

          {/* Bottom: Help Center + Profile + Logout */}
          <div className="mt-2 flex shrink-0 flex-col gap-1 border-t border-white/5 pt-3">
            <Link
              to="/help"
              {...linkPrefetchProps('/help')}
              onClick={handleNavClick}
              title={collapsed ? 'Help Center' : undefined}
              aria-label={collapsed ? 'Help Center' : undefined}
              aria-current={pathname.startsWith('/help') ? 'page' : undefined}
              className={linkClass('/help')}
            >
              <span
                className={
                  pathname.startsWith('/help')
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
              aria-label={collapsed ? 'Profile' : undefined}
              aria-current={pathname === '/dashboard/profile' ? 'page' : undefined}
              className={linkClass('/dashboard/profile')}
            >
              <span
                className={
                  pathname === '/dashboard/profile'
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
              aria-label="Logout"
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
