import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: boolean
  successMessage?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, successMessage, id, className = '', ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    const showSuccess = Boolean(success && !error && (successMessage ?? '').trim())

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500',
            'transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20',
            error ? 'border-rose-500/70 focus:border-rose-500/70 focus:ring-rose-500/20' : '',
            showSuccess ? 'border-emerald-500/60 focus:border-emerald-500/60 focus:ring-emerald-500/20' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-rose-300" role="alert">
            {error}
          </p>
        )}
        {showSuccess && successMessage && (
          <p className="mt-1.5 text-xs font-medium text-emerald-300" role="status" aria-live="polite">
            {successMessage}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
