import type { ReactNode } from 'react'

export type StatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'purple'

const variantClass: Record<StatusBadgeVariant, string> = {
  success: 'bg-emerald-500/12 text-emerald-200 ring-emerald-500/25',
  warning: 'bg-amber-500/12 text-amber-200 ring-amber-500/25',
  danger: 'bg-rose-500/12 text-rose-200 ring-rose-500/25',
  info: 'bg-blue-500/12 text-blue-200 ring-blue-500/25',
  neutral: 'bg-slate-500/12 text-slate-300 ring-white/10',
  purple: 'bg-violet-500/12 text-violet-200 ring-violet-500/25',
}

const dotClass: Record<StatusBadgeVariant, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-blue-400',
  neutral: 'bg-slate-400',
  purple: 'bg-violet-400',
}

export function StatusBadge({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
}: {
  children: ReactNode
  variant?: StatusBadgeVariant
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={[
        'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ring-1',
        variantClass[variant],
        className,
      ].join(' ')}
    >
      {dot ? <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass[variant]}`} /> : null}
      <span className="truncate">{children}</span>
    </span>
  )
}
