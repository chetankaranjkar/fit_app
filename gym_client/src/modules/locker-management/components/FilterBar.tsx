import type { ReactNode } from 'react'

interface SelectOption {
  value: string
  label: string
}

/**
 * Reusable search + select toolbar shared across list-style pages in the
 * Locker Management module.
 */
export function FilterBar({
  search,
  onSearchChange,
  placeholder = 'Search\u2026',
  selects = [],
  right,
}: {
  search: string
  onSearchChange: (v: string) => void
  placeholder?: string
  selects?: Array<{
    value: string
    onChange: (v: string) => void
    options: SelectOption[]
    label: string
  }>
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-6 py-4">
      <div className="relative min-w-[200px] flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
        />
      </div>
      {selects.map((s) => (
        <select
          key={s.label}
          aria-label={s.label}
          value={s.value}
          onChange={(e) => s.onChange(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
        >
          {s.options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  )
}
