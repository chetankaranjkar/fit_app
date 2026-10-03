import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { trapTabKey } from '../../lib/dialogFocus'

type ModalSize = 'default' | 'wide' | 'md' | 'sm'

/** Sticky action row inside the scrollable body when a dedicated `footer` is not used. */
export const modalActionBarClass =
  'sticky bottom-0 z-[1] -mx-6 -mb-5 mt-5 flex flex-wrap justify-end gap-2 border-t border-white/5 bg-[rgba(11,11,26,0.98)] px-6 py-4'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'default',
  scrollable = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: ReactNode
  size?: ModalSize
  scrollable?: boolean
  /** When false, clicking the dimmed backdrop does not dismiss (use for long forms). */
  closeOnBackdropClick?: boolean
  /** When false, Escape does not dismiss. */
  closeOnEscape?: boolean
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
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current?.focus()
    })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation()
        onClose()
        return
      }
      const panel = panelRef.current
      if (panel) trapTabKey(e, panel)
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
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
        <div
          className={backdropClassName}
          style={backdropStyle}
          onClick={onClose}
        />
      ) : (
        <div className={backdropClassName} style={backdropStyle} aria-hidden />
      )}
      <div className="pointer-events-none relative z-10 flex max-h-[100dvh] min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="flex min-h-0 w-full flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`pointer-events-auto relative flex w-full min-h-0 ${maxWidthClass} max-h-[min(85vh,calc(100dvh-5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(11,11,26,0.92)] shadow-2xl backdrop-blur-xl outline-none`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
            />
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
              <h2 id={titleId} className="truncate pr-8 text-base font-semibold text-white">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={contentClass} data-lenis-prevent>
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-white/5 bg-[rgba(11,11,26,0.98)] px-6 py-4">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
