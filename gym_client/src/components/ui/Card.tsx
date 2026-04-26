import { type HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional title rendered at the top of the card */
  title?: string
}

/**
 * Legacy Card wrapper kept for backward compatibility.
 * Prefer `GlassCard` in `./GlassCard.tsx` for new code.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ title, children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          'glass-card rounded-2xl',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {title && (
          <h2 className="border-b border-white/5 px-6 py-4 text-lg font-semibold text-white/90">
            {title}
          </h2>
        )}
        <div className="p-6">{children}</div>
      </div>
    )
  }
)

Card.displayName = 'Card'
