import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type ModalSize = 'default' | 'wide'

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'default',
  scrollable = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: ModalSize
  scrollable?: boolean
  /** When false, clicking the dimmed backdrop does not dismiss (use for long forms). */
  closeOnBackdropClick?: boolean
  /** When false, Escape does not dismiss. */
  closeOnEscape?: boolean
}) {
  useEffect(() => {
    if (!open || !closeOnEscape) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose, closeOnEscape])

  if (!open) return null

  const maxWidthClass = size === 'wide' ? 'max-w-3xl' : 'max-w-md'
  const contentClass = scrollable
    ? 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5'
    : 'overflow-y-auto overscroll-contain max-h-[calc(100dvh-8rem)] px-6 py-5'

  const backdropClassName = 'absolute inset-0 bg-black/45'
  const backdropStyle = {
    WebkitBackdropFilter: 'blur(18px)',
    backdropFilter: 'blur(18px)',
  } as const

  return createPortal(
    <div className="fixed inset-0 z-[220]" data-lenis-prevent>
      {closeOnBackdropClick ? (
        <button
          type="button"
          className={`${backdropClassName} cursor-default`}
          style={backdropStyle}
          aria-label="Close dialog"
          onClick={onClose}
        />
      ) : (
        <div className={backdropClassName} style={backdropStyle} aria-hidden />
      )}
      <div className="pointer-events-none relative z-10 flex max-h-[100dvh] min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="flex min-h-0 w-full flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={`pointer-events-auto relative flex w-full min-h-0 ${maxWidthClass} max-h-[min(85vh,calc(100dvh-5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(11,11,26,0.92)] shadow-2xl backdrop-blur-xl`}
          >
            {/* Glow accent line */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
            />
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
              <h2 id="modal-title" className="truncate pr-8 text-base font-semibold text-white">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={contentClass} data-lenis-prevent>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
