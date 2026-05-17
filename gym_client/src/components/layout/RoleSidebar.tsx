import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { useDashboardRole } from '../../features/auth/DashboardRoleContext'
import {
  ROLE_BRAND,
  ROLE_NAV,
  ROLE_NAV_GROUPS,
  getTrainerNavGroups,
  getTrainerNavItems,
  type NavIcon,
  type NavItem,
} from './roleNavConfig'
import { linkPrefetchProps, prefetchRoute } from '../../routes/prefetch'

const iconMap: Record<NavIcon, ReactNode> = {
  dashboard: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  users: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  trainers: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
  plans: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  analytics: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  security: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  settings: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  workouts: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  diet: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  progress: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  profile: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  scan: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h2m14 0h2M4 4h2m12 12h2M4 20h2m12-12h2" />
    </svg>
  ),
}

const accentActive: Record<string, string> = {
  admin: 'bg-gradient-to-r from-blue-500/25 to-violet-500/20 text-white border-blue-400/30 shadow-[0_0_20px_-4px_rgba(96,165,250,0.4)]',
  trainer: 'bg-gradient-to-r from-orange-500/25 to-red-500/15 text-white border-orange-400/30 shadow-[0_0_20px_-4px_rgba(251,146,60,0.4)]',
  member: 'bg-gradient-to-r from-orange-500/20 to-amber-500/15 text-white border-orange-400/25 shadow-[0_0_20px_-4px_rgba(249,115,22,0.35)]',
}

function NavLinkItem({
  item,
  collapsed,
  accent,
  isActive,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  accent: string
  isActive: (path: string) => boolean
  onNavigate: () => void
}) {
  const active = isActive(item.path)
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      {...linkPrefetchProps(item.path)}
      onMouseEnter={() => prefetchRoute(item.path)}
      className={[
        'flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active ? accentActive[accent] : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
        collapsed ? 'justify-center px-2' : '',
      ].join(' ')}
      title={collapsed ? item.label : undefined}
    >
      {iconMap[item.icon]}
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

export function RoleSidebar({
  userName,
  userAvatarUrl: _userAvatarUrl,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  hideOnMobile = false,
}: {
  userName: string
  userAvatarUrl?: string | null
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  /** When true, sidebar is desktop-only (member uses bottom nav on phone). */
  hideOnMobile?: boolean
}) {
  const role = useDashboardRole()
  const brand = ROLE_BRAND[role]
  const items = role === 'trainer' ? getTrainerNavItems() : ROLE_NAV[role]
  const groups = role === 'trainer' ? getTrainerNavGroups() : ROLE_NAV_GROUPS[role]
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) =>
    path === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(path)

  const groupActive = (children: { path: string }[]) => children.some((c) => isActive(c.path))

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of groups) {
      init[g.id] = groupActive(g.children)
    }
    return init
  })

  useEffect(() => {
    for (const g of groups) {
      if (groupActive(g.children)) {
        setOpenGroups((prev) => ({ ...prev, [g.id]: true }))
      }
    }
  }, [pathname, role])

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      /* ignore */
    }
    authService.clearSession()
    navigate('/login', { replace: true })
  }

  const onNavigate = () => onCloseMobile()

  const sidebarContent = (
    <aside
      className={[
        'flex h-full flex-col border-r border-white/[0.06] bg-slate-950/80 backdrop-blur-2xl',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-[72px]' : 'w-64',
      ].join(' ')}
    >
      <div
        className={`flex items-center gap-3 border-b border-white/[0.06] p-4 ${collapsed ? 'justify-center' : ''}`}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white">
          P
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{brand.title}</p>
            <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">{brand.subtitle}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLinkItem
            key={item.path}
            item={item}
            collapsed={collapsed}
            accent={brand.accent}
            isActive={isActive}
            onNavigate={onNavigate}
          />
        ))}

        {groups.map((group) => {
          const open = openGroups[group.id] ?? false
          const active = groupActive(group.children)
          return (
            <div key={group.id} className="pt-1">
              <button
                type="button"
                onClick={() => setOpenGroups((p) => ({ ...p, [group.id]: !open }))}
                className={[
                  'flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  active ? accentActive[brand.accent] : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                  collapsed ? 'justify-center px-2' : '',
                ].join(' ')}
                title={collapsed ? group.label : undefined}
              >
                {iconMap[group.icon]}
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{group.label}</span>
                    <svg
                      className={`size-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
              {!collapsed && open && (
                <ul className="ml-2 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                  {group.children.map((child) => (
                    <li key={child.path}>
                      <Link
                        to={child.path}
                        onClick={onNavigate}
                        {...linkPrefetchProps(child.path)}
                        className={[
                          'block rounded-lg py-2 pl-2 pr-2 text-sm transition-colors duration-200',
                          pathname === child.path || pathname.startsWith(child.path + '/')
                            ? 'font-medium text-orange-200'
                            : 'text-slate-500 hover:text-slate-200',
                        ].join(' ')}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        {!collapsed && <p className="mb-2 truncate px-2 text-xs text-slate-500">{userName}</p>}
        <button
          type="button"
          onClick={() => void handleLogout()}
          className={[
            'w-full rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white',
            collapsed ? 'px-2' : '',
          ].join(' ')}
        >
          {collapsed ? '⎋' : 'Sign out'}
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mt-2 hidden w-full rounded-lg py-1.5 text-[10px] text-slate-500 hover:text-slate-300 lg:block"
        >
          {collapsed ? '→' : '← Collapse'}
        </button>
      </div>
    </aside>
  )

  const desktopWrap = hideOnMobile ? 'hidden lg:flex h-full shrink-0' : 'hidden h-full shrink-0 lg:flex'

  return (
    <>
      <div className={desktopWrap}>{sidebarContent}</div>
      {mobileOpen && !hideOnMobile && (
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
