import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

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
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[210]" role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
      />
      <div
        className={`absolute inset-y-0 right-0 flex w-full ${widthClass} flex-col overflow-hidden border-l border-white/10 bg-[rgba(11,11,26,0.96)] shadow-[-30px_0_60px_-20px_rgba(0,0,0,0.8)]`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/5 px-6 py-5">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-white">{title}</div>
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
