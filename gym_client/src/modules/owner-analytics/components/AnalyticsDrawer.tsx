import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { IconClose } from './Icons'

/**
 * Reusable right-side drawer used by every KPI drill-down. Keeps animation,
 * focus / ESC handling, and glass styling in one place so each content pane
 * can stay a plain component.
 */
export function AnalyticsDrawer({
  open,
  onClose,
  title,
  subtitle,
  summary,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  /** Optional top mini-summary strip rendered inside the header (e.g. "\u20b945,000 \u219112%"). */
  summary?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // GSAP enter animation
  useEffect(() => {
    if (!open) return
    const backdrop = backdropRef.current
    const panel = panelRef.current
    const body = bodyRef.current
    if (!backdrop || !panel) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: 'power2.out' },
      )
      gsap.fromTo(
        panel,
        { xPercent: 100 },
        { xPercent: 0, duration: 0.35, ease: 'power3.out' },
      )
      if (body) {
        gsap.fromTo(
          body.querySelectorAll('[data-drawer-section]'),
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.05, delay: 0.15 },
        )
      }
    })
    return () => ctx.revert()
  }, [open])

  // ESC to close + lock body scroll while open
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
    <div className="fixed inset-0 z-[70]">
      <div
        ref={backdropRef}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"
        aria-hidden
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={[
          'absolute right-0 top-0 flex h-full w-full flex-col overflow-hidden',
          'sm:w-[440px] md:w-[480px] lg:w-[500px]',
          // Glassmorphism + soft border + shadow
          'border-l border-white/10 bg-[rgba(10,12,24,0.78)] text-slate-100 backdrop-blur-2xl',
          'shadow-[-24px_0_48px_-24px_rgba(0,0,0,0.7)]',
        ].join(' ')}
      >
        {/* Sticky header */}
        <header className="sticky top-0 z-10 border-b border-white/10 bg-[linear-gradient(180deg,rgba(17,20,38,0.9),rgba(10,12,24,0.7))] px-6 py-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-white">{title}</h2>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className={[
                'inline-flex size-9 items-center justify-center rounded-xl border border-white/10 text-slate-300',
                'transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/5 hover:text-white hover:shadow-lg',
                'active:scale-95',
              ].join(' ')}
            >
              <IconClose className="size-4" />
            </button>
          </div>
          {summary && <div className="mt-4">{summary}</div>}
        </header>

        {/* Scrollable body */}
        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:thin]"
        >
          {children}
        </div>

        {footer && (
          <footer className="border-t border-white/10 bg-[rgba(10,12,24,0.8)] px-6 py-4 backdrop-blur-xl">
            {footer}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  )
}

/**
 * Tiny helper row used by most drawer tables/cards to keep spacing consistent.
 */
export function DrawerSection({
  title,
  action,
  children,
}: {
  title: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section data-drawer-section className="mb-6 last:mb-2">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}
