import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { scrollToSection } from '../../lib/animations/useSmoothScroll'
import { TigerLogo } from './TigerLogo'

const NAV_LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'plans', label: 'Plans' },
  { id: 'trainers', label: 'Trainers' },
  { id: 'gallery', label: 'Transformations' },
  { id: 'facility', label: 'Facility' },
  { id: 'app', label: 'App' },
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
          ? 'border-b border-[rgba(245,196,0,0.18)] bg-[rgba(0,0,0,0.78)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          to="/"
          aria-label="Tiger Fitness — home"
          className="group flex items-center"
        >
          <TigerLogo variant="full" size={44} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onLinkClick(l.id)}
              className="group/navlink relative font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-white/75 transition hover:text-white"
            >
              {l.label}
              <span className="pointer-events-none absolute -bottom-1.5 left-0 h-px w-0 bg-[#F5C400] shadow-[0_0_10px_rgba(245,196,0,0.6)] transition-all duration-300 group-hover/navlink:w-full" />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/85 transition hover:border-[rgba(245,196,0,0.45)] hover:text-white md:inline-block"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={() => onLinkClick('plans')}
            className="relative hidden overflow-hidden rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-black tiger-glow transition hover:scale-[1.03] active:scale-[0.97] md:inline-flex"
          >
            <span className="absolute inset-0 gradient-tiger" />
            <span className="relative">Join now</span>
          </button>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
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
        className={`lg:hidden ${
          mobileOpen ? 'max-h-[36rem] border-t border-[rgba(245,196,0,0.18)]' : 'max-h-0'
        } overflow-hidden bg-[rgba(0,0,0,0.96)] backdrop-blur-xl transition-[max-height] duration-300`}
      >
        <nav className="flex flex-col gap-1 p-4">
          {NAV_LINKS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onLinkClick(l.id)}
              className="rounded-xl px-3 py-2.5 text-left font-sans text-sm font-semibold uppercase tracking-[0.08em] text-white/85 transition hover:bg-white/5 hover:text-[#F5C400]"
            >
              {l.label}
            </button>
          ))}
          <div className="mt-2 flex gap-2">
            <Link
              to="/login"
              className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-white/85 transition hover:bg-white/5"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => onLinkClick('plans')}
              className="flex-1 rounded-xl bg-[linear-gradient(135deg,#FFD942_0%,#F5C400_50%,#D9A400_100%)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-black"
            >
              Join now
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
