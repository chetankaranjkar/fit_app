import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ROLE_NAV, type NavItem } from './roleNavConfig'
import { linkPrefetchProps, prefetchRoute } from '../../routes/prefetch'

const iconMap: Record<NavItem['icon'], ReactNode | null> = {
  dashboard: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  workouts: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  diet: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  progress: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  profile: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  users: null,
  trainers: null,
  payments: null,
  attendance: null,
  plans: null,
  analytics: null,
  security: null,
  settings: null,
  scan: null,
}

/** Mobile bottom navigation for members (Apple Fitness–style). */
export function MemberBottomNav() {
  const { pathname } = useLocation()
  const items = ROLE_NAV.member

  const isActive = (path: string) =>
    path === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(path)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[rgba(5,5,16,0.92)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
      aria-label="Member navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-1">
        {items.map((item) => {
          const active = isActive(item.path)
          const icon = iconMap[item.icon]
          if (!icon) return null
          return (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                {...linkPrefetchProps(item.path)}
                onMouseEnter={() => prefetchRoute(item.path)}
                className={[
                  'flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium transition-all duration-200',
                  active ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                <span className={active ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]' : ''}>{icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
