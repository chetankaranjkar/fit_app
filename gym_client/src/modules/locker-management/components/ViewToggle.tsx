import type { ReactNode } from 'react'

/**
 * Pill-style segmented control used to toggle between list views (e.g. Grid/Table).
 */
export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: ReactNode }[]
}) {
  return (
    <div
      role="tablist"
      aria-label="View toggle"
      className="inline-flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/5 p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={[
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              active
                ? 'bg-gradient-to-r from-blue-500/25 to-purple-500/25 text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.4)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white',
            ].join(' ')}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
