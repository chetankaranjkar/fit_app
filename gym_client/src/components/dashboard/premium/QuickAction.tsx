import { Link } from 'react-router-dom'
import type { DashboardRole } from '../../../features/auth/roleRouting'

const accents: Record<DashboardRole, string> = {
  admin: 'from-blue-500/20 to-violet-500/20 border-blue-400/20 hover:border-blue-400/40',
  trainer: 'from-orange-500/20 to-red-500/20 border-orange-400/20 hover:border-orange-400/40',
  member: 'from-orange-500/15 to-amber-500/15 border-orange-400/20 hover:border-orange-400/40',
}

export function QuickAction({
  to,
  label,
  description,
  role = 'admin',
  icon,
}: {
  to: string
  label: string
  description?: string
  role?: DashboardRole
  icon: import('react').ReactNode
}) {
  return (
    <Link
      to={to}
      className={[
        'flex items-center gap-3 rounded-xl border bg-gradient-to-br p-4',
        'transition-all duration-200 hover:-translate-y-0.5',
        accents[role],
      ].join(' ')}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{label}</span>
        {description && <span className="block truncate text-xs text-slate-400">{description}</span>}
      </span>
    </Link>
  )
}
