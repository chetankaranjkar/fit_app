import type { ReactNode } from 'react'

/**
 * Module-scoped frosted card with a subtle hover lift + scale (1.02 max).
 * The hover effect is delivered purely through Tailwind transforms so no
 * global CSS is overridden.
 */
export function ModuleCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={[
        'glass-card dashboard-card group min-w-0 rounded-2xl p-5 transition-all duration-300',
        'hover:-translate-y-0.5 hover:scale-[1.02] hover:border-white/20',
        'hover:shadow-[0_8px_30px_-8px_rgba(96,165,250,0.35)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
