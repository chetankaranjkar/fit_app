import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { trapTabKey } from '../../lib/dialogFocus'

/** Right-side drawer for record detail views. */
export function SlideOverPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClass = 'max-w-[440px]',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  widthClass?: string
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLElement)) return
      if (target.closest('[role="dialog"]')) return
      restoreFocusRef.current = target
    }
    document.addEventListener('focusin', onFocusIn, true)
    return () => document.removeEventListener('focusin', onFocusIn, true)
  }, [])

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true
      return
    }
    if (!wasOpenRef.current) return
    wasOpenRef.current = false
    restoreFocusRef.current?.focus?.()
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!restoreFocusRef.current && document.activeElement instanceof HTMLElement) {
      restoreFocusRef.current = document.activeElement
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      const panel = panelRef.current
      if (panel) trapTabKey(e, panel)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => panelRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[210]">
      <div
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute inset-y-0 right-0 flex w-full ${widthClass} flex-col overflow-hidden border-l border-white/10 bg-[rgba(11,11,26,0.96)] shadow-[-30px_0_60px_-20px_rgba(0,0,0,0.8)] outline-none`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/5 px-6 py-5">
          <div className="min-w-0">
            <div id={titleId} className="truncate text-lg font-semibold text-white">
              {title}
            </div>
            {subtitle ? <div className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-white/5 bg-black/30 px-6 py-4">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
