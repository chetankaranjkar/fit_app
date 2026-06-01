import type { ReactNode } from 'react'
import { AnimatedStat } from './AnimatedStat'
import type { DashboardRole } from '../../../features/auth/roleRouting'

const ring: Record<DashboardRole, string> = {
  admin: 'from-blue-500/30 to-violet-500/30',
  trainer: 'from-orange-500/30 to-red-500/30',
  member: 'from-orange-500/25 to-amber-600/25',
}

export function HeroStat({
  label,
  value,
  numericValue,
  format,
  icon,
  role = 'admin',
}: {
  label: string
  value?: string
  numericValue?: number
  format?: (n: number) => string
  icon?: ReactNode
  role?: DashboardRole
}) {
  return (
    <article
      className={[
        'relative h-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4',
        'backdrop-blur-xl transition-all duration-200 sm:hover:border-white/15',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br blur-2xl ${ring[role]}`}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1 break-words text-xl font-bold tabular-nums leading-tight text-white sm:text-2xl">
            {numericValue != null && format ? (
              <AnimatedStat value={numericValue} format={format} />
            ) : (
              value ?? '—'
            )}
          </p>
        </div>
        {icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200">
            {icon}
          </span>
        ) : null}
      </div>
    </article>
  )
}
