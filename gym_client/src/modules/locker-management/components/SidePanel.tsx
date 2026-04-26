import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { IconX } from './Icons'

/**
 * Right-side sliding panel used for locker details.
 * - Portals into document.body so it sits above all app chrome.
 * - Animation effect depends ONLY on `open` so fresh `onClose` arrow
 *   functions from the parent don't restart the tween on every re-render
 *   (which previously left the panel stuck off-screen behind a blurred
 *   backdrop). ESC + body-scroll lock live in their own effect.
 * - Uses `useLayoutEffect` + `gsap.set` to place the panel off-screen
 *   before the browser paints, so there is no visible flash.
 */
export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // GSAP enter animation. Runs once on open, teardown on close/unmount.
  useLayoutEffect(() => {
    if (!open) return
    const backdrop = backdropRef.current
    const panel = panelRef.current
    if (!backdrop || !panel) return

    const ctx = gsap.context(() => {
      gsap.set(panel, { xPercent: 100 })
      gsap.set(backdrop, { opacity: 0 })
      gsap.to(backdrop, { opacity: 1, duration: 0.22, ease: 'power2.out' })
      gsap.to(panel, { xPercent: 0, duration: 0.36, ease: 'power3.out' })
    })
    return () => ctx.revert()
  }, [open])

  // ESC to close + lock body scroll while open. Kept in a separate effect so
  // a changing `onClose` reference does not restart the animation above.
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
        ref={backdropRef}
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        className="absolute inset-0 cursor-default bg-black/55"
        style={{ WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
      />
      <div
        ref={panelRef}
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col overflow-hidden border-l border-white/10 bg-[rgba(11,11,26,0.96)] shadow-[-30px_0_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
      >
        {/* Top glow accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
        />

        <header className="flex items-start justify-between gap-3 border-b border-white/5 px-6 py-5">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-white">{title}</div>
            {subtitle && <div className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="Close"
          >
            <IconX className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5" data-lenis-prevent>
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-white/5 bg-black/30 px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
