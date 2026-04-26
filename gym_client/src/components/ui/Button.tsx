import { type ButtonHTMLAttributes, forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'soft'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  // Neon gradient primary
  primary:
    'text-white shadow-lg shadow-blue-500/20 hover:shadow-purple-500/30 focus:ring-blue-400/50 disabled:opacity-60 bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)] hover:brightness-110',
  secondary:
    'bg-white/5 text-white border border-white/10 hover:bg-white/10 focus:ring-white/20 disabled:opacity-50',
  ghost:
    'bg-transparent text-slate-300 hover:bg-white/5 hover:text-white focus:ring-white/20',
  outline:
    'border border-blue-400/50 text-blue-300 bg-transparent hover:bg-blue-500/10 hover:border-blue-400 focus:ring-blue-400/50',
  soft:
    'bg-white/5 text-slate-200 hover:bg-white/10 focus:ring-white/20 disabled:opacity-50',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-8 py-3.5 text-base rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      className = '',
      disabled,
      children,
      type,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        {...rest}
        type={type ?? 'button'}
        disabled={disabled ?? isLoading}
        className={[
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
