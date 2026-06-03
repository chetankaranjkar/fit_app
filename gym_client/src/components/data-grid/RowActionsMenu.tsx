import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'
import type { RowAction } from './types'

const variantClass: Record<NonNullable<RowAction<unknown>['variant']>, string> = {
  default: 'text-slate-200 hover:bg-white/8',
  success: 'text-emerald-200 hover:bg-emerald-500/10',
  warning: 'text-amber-200 hover:bg-amber-500/10',
  danger: 'text-rose-300 hover:bg-rose-500/10',
}

type MenuPosition = { top: number; left: number }

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
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const visible = actions.filter((a) => !a.hidden?.(row))

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const menuWidth = menuRef.current?.offsetWidth ?? 152
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8))
    const top = rect.bottom + 4
    setMenuPos({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
  }, [open, updateMenuPosition, visible.length])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScroll = () => updateMenuPosition()
    document.addEventListener('click', onDocClick, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('click', onDocClick, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, updateMenuPosition])

  if (visible.length === 0) return <span className="text-slate-600">—</span>

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (open) {
      setOpen(false)
      return
    }
    const btn = buttonRef.current
    if (btn) {
      const rect = btn.getBoundingClientRect()
      const menuWidth = 152
      const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8))
      setMenuPos({ top: rect.bottom + 4, left })
    }
    setOpen(true)
  }

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
            className="min-w-[9.5rem] overflow-hidden rounded-xl border border-white/10 bg-[rgba(12,12,24,0.98)] py-1 shadow-xl shadow-black/40 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {visible.map((action) => {
              const disabled = action.disabled?.(row)
              return (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation()
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
          </div>,
          document.body,
        )
      : null

  return (
    <div className="relative inline-flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggleOpen}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu}
    </div>
  )
}
