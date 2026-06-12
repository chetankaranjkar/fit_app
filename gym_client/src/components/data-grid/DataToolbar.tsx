import type { ReactNode } from 'react'
import { Loader2, Search } from 'lucide-react'
import { formSelectClassCompact, formSelectOptionClass } from '../../lib/formControls'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-blue-400/50 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-blue-400/20'

export function DataToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  searchAriaLabel = 'Search',
  searchLoading = false,
  filters,
  actions,
  className = '',
}: {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  searchAriaLabel?: string
  searchLoading?: boolean
  filters?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center ${className}`}>
      {onSearchChange != null ? (
        <div className="relative min-w-0 flex-1">
          {searchLoading ? (
            <Loader2
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-400"
              aria-hidden
            />
          ) : (
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          )}
          <input
            type="search"
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            aria-busy={searchLoading}
            className={inputClass}
          />
        </div>
      ) : null}
      {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{actions}</div> : null}
    </div>
  )
}

export function DataFilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  ariaLabel: string
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={`${formSelectClassCompact} ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className={formSelectOptionClass}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
