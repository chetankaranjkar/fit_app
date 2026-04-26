import { type ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  /** A Tailwind gradient pair e.g. "from-blue-500 to-purple-500" */
  gradient?: string
  /**
   * Deprecated: a Tailwind bg class like "bg-indigo-500".
   * Kept for backward compatibility — when provided, it overrides `gradient`.
   */
  iconBg?: string
  icon: ReactNode
  className?: string
  /** Optional delta e.g. "+12.4%" */
  delta?: string
  /** Whether the delta is positive (green) or negative (red) */
  deltaTrend?: 'up' | 'down'
  /** Optional caption shown under title */
  caption?: string
}

export function MetricCard({
  title,
  value,
  gradient = 'from-blue-500 to-purple-500',
  iconBg,
  icon,
  className,
  delta,
  deltaTrend = 'up',
  caption,
}: MetricCardProps) {
  const iconClass = iconBg
    ? `${iconBg} text-white`
    : `bg-gradient-to-br ${gradient} text-white`

  const blobClass = iconBg
    ? `${iconBg}`
    : `bg-gradient-to-br ${gradient}`

  return (
    <div
      className={[
        'group glass-card relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5',
        'hover:border-white/20 hover:shadow-[0_8px_30px_-8px_rgba(96,165,250,0.35)]',
        className || '',
      ].join(' ')}
    >
      {/* Decorative gradient/solid blob */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30 ${blobClass}`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          {caption && (
            <p className="mt-1 truncate text-xs text-slate-500">{caption}</p>
          )}
          {delta && (
            <div
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                deltaTrend === 'up'
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-rose-500/10 text-rose-300'
              }`}
            >
              <svg
                className={`size-3 ${deltaTrend === 'down' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
              {delta}
            </div>
          )}
        </div>
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl shadow-lg ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}
