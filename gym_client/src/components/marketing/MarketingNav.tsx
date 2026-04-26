import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { scrollToSection } from '../../lib/animations/useSmoothScroll'

const NAV_LINKS = [
  { id: 'programs', label: 'Programs' },
  { id: 'trainers', label: 'Trainers' },
  { id: 'plans', label: 'Pricing' },
  { id: 'gallery', label: 'Transformations' },
  { id: 'testimonials', label: 'Stories' },
  { id: 'contact', label: 'Contact' },
]

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const onLinkClick = (id: string) => {
    setMobileOpen(false)
    scrollToSection(id)
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/5 bg-[rgba(7,8,20,0.72)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          to="/"
          className="group flex items-center gap-2 text-lg font-bold tracking-tight text-white"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)] shadow-[0_8px_24px_-6px_rgba(139,92,246,0.55)]">
            <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
              <path d="M4 12h2M18 12h2" />
            </svg>
          </span>
          <span>
            IRON<span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">PULSE</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onLinkClick(l.id)}
              className="group/navlink relative text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {l.label}
              <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 group-hover/navlink:w-full" />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-200 transition hover:text-white md:inline-block"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={() => onLinkClick('contact')}
            className="relative hidden overflow-hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.7)] transition hover:scale-[1.02] active:scale-[0.98] md:inline-flex"
          >
            <span className="absolute inset-0 bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)]" />
            <span className="relative">Join now</span>
          </button>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              {mobileOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden ${
          mobileOpen ? 'max-h-96 border-t border-white/5' : 'max-h-0'
        } overflow-hidden bg-[rgba(7,8,20,0.96)] backdrop-blur-xl transition-[max-height] duration-300`}
      >
        <nav className="flex flex-col gap-1 p-4">
          {NAV_LINKS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onLinkClick(l.id)}
              className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-white/5"
            >
              {l.label}
            </button>
          ))}
          <div className="mt-2 flex gap-2">
            <Link
              to="/login"
              className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => onLinkClick('contact')}
              className="flex-1 rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Join now
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
