import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { RowAction } from './types'

const variantClass: Record<NonNullable<RowAction<unknown>['variant']>, string> = {
  default: 'text-slate-200 hover:bg-white/8',
  success: 'text-emerald-200 hover:bg-emerald-500/10',
  warning: 'text-amber-200 hover:bg-amber-500/10',
  danger: 'text-rose-300 hover:bg-rose-500/10',
}

export function RowActionsMenu<T>({
  row,
  actions,
  ariaLabel = 'Row actions',
}: {
  row: T
  actions: RowAction<T>[]
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const visible = actions.filter((a) => !a.hidden?.(row))

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (visible.length === 0) return <span className="text-slate-600">—</span>

  return (
    <div ref={rootRef} className="relative inline-flex justify-end">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[9.5rem] overflow-hidden rounded-xl border border-white/10 bg-[rgba(12,12,24,0.98)] py-1 shadow-xl shadow-black/40 backdrop-blur-xl"
        >
          {visible.map((action) => {
            const disabled = action.disabled?.(row)
            return (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return
                  setOpen(false)
                  action.onClick(row)
                }}
                className={[
                  'block w-full px-3 py-2 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
                  variantClass[action.variant ?? 'default'],
                ].join(' ')}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
