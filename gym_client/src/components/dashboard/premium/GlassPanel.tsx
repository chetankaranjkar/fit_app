import type { ReactNode } from 'react'
import type { DashboardRole } from '../../../features/auth/roleRouting'

const glow: Record<DashboardRole, string> = {
  admin: 'hover:shadow-[0_12px_40px_-12px_rgba(96,165,250,0.35)]',
  trainer: 'hover:shadow-[0_12px_40px_-12px_rgba(251,146,60,0.35)]',
  member: 'hover:shadow-[0_12px_40px_-12px_rgba(249,115,22,0.35)]',
}

export function GlassPanel({
  children,
  className = '',
  role = 'admin',
  title,
  subtitle,
  action,
}: {
  children: ReactNode
  className?: string
  role?: DashboardRole
  title?: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <section
      className={[
        'glass-card group relative overflow-hidden rounded-2xl border border-white/[0.08] p-5 sm:p-6',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15',
        glow[role],
        className,
      ].join(' ')}
    >
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-semibold tracking-tight text-white">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
