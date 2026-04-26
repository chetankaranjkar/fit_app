import { type HTMLAttributes, forwardRef } from 'react'

type GlassCardVariant = 'default' | 'strong' | 'gradient-border'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional title rendered at the top of the card */
  title?: string
  /** Optional trailing node on the right of the title row (e.g. a menu / select) */
  action?: React.ReactNode
  /** Controls visual intensity / treatment */
  variant?: GlassCardVariant
  /** Enable an inner glow hover effect */
  glow?: boolean
  /** Removes default inner padding so children can own the layout */
  noPadding?: boolean
}

const variantStyles: Record<GlassCardVariant, string> = {
  default: 'glass-card',
  strong: 'glass-card-strong',
  'gradient-border': 'glass-card border-gradient-neon',
}

/**
 * Reusable glassmorphism card. Used throughout the dashboard to give
 * a consistent dark, semi-transparent, blurred surface with subtle
 * neon gradient accents.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      title,
      action,
      variant = 'default',
      glow = false,
      noPadding = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={[
          'relative rounded-2xl transition-all duration-300',
          variantStyles[variant],
          glow &&
            'hover:border-blue-400/30 hover:shadow-[0_0_24px_-4px_rgba(96,165,250,0.35)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {(title || action) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
            {title && (
              <h2 className="text-base font-semibold tracking-wide text-white/90">
                {title}
              </h2>
            )}
            {action && <div className="flex items-center gap-2">{action}</div>}
          </div>
        )}
        <div className={noPadding ? '' : 'p-6'}>{children}</div>
      </div>
    )
  }
)

GlassCard.displayName = 'GlassCard'
