import { Link } from 'react-router-dom'
import { scrollToSection } from '../../lib/animations/useSmoothScroll'

const FOOTER_LINKS: Array<{ title: string; items: Array<{ label: string; href?: string; to?: string; section?: string }> }> = [
  {
    title: 'Train',
    items: [
      { label: 'Programs', section: 'programs' },
      { label: 'Trainers', section: 'trainers' },
      { label: 'Transformations', section: 'gallery' },
      { label: 'Testimonials', section: 'testimonials' },
    ],
  },
  {
    title: 'Member',
    items: [
      { label: 'Plans', section: 'plans' },
      { label: 'Sign in', to: '/login' },
      { label: 'Contact', section: 'contact' },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Press', href: '#' },
      { label: 'Privacy', href: '#' },
    ],
  },
]

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-white/5 bg-[rgba(5,6,16,0.9)] pt-16">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr]">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)]">
                <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                  <path d="M4 12h2M18 12h2" />
                </svg>
              </span>
              <span>
                IRON<span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">PULSE</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              A premium strength & conditioning studio. Data-driven coaching,
              recovery-first programming, and a community that holds you
              accountable.
            </p>
            <div className="mt-6 flex gap-3">
              {[
                { label: 'Instagram', d: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.5.4 1.2.4 2.3.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.5.2-1.2.4-2.3.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.9-.2-2.3-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.5-.4-1.2-.4-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.9.4-2.3.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.5-.2 1.2-.4 2.3-.4C8.4 2.2 8.8 2.2 12 2.2zm0 5.4a4.4 4.4 0 100 8.8 4.4 4.4 0 000-8.8zm5.6-.4a1 1 0 100 2 1 1 0 000-2zM12 9.4a2.6 2.6 0 110 5.2 2.6 2.6 0 010-5.2z' },
                { label: 'Twitter', d: 'M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.4-1.3 1.7-2.2-.8.4-1.6.7-2.5.9a3.9 3.9 0 00-6.7 3.6A11 11 0 013 4.8a3.9 3.9 0 001.2 5.2c-.6 0-1.2-.2-1.7-.5v.1c0 1.9 1.4 3.5 3.1 3.8-.6.2-1.3.2-1.9.1.5 1.6 2 2.7 3.8 2.8A7.9 7.9 0 012 18.3a11 11 0 006 1.8c7.2 0 11.1-6 11.1-11.1v-.5c.8-.5 1.5-1.2 2-2z' },
                { label: 'YouTube', d: 'M23.5 6.5a3 3 0 00-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.4A3 3 0 00.5 6.5C.1 8.4.1 12 .1 12s0 3.6.4 5.5a3 3 0 002.1 2.1c1.9.4 9.4.4 9.4.4s7.5 0 9.4-.4a3 3 0 002.1-2.1c.4-1.9.4-5.5.4-5.5s0-3.6-.4-5.5zM9.8 15.6V8.4l6.2 3.6-6.2 3.6z' },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/25 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                    <path d={s.d} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link groups */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER_LINKS.map((group) => (
              <div key={group.title}>
                <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {group.title}
                </h4>
                <ul className="mt-4 space-y-3 text-sm">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      {item.to ? (
                        <Link to={item.to} className="text-slate-300 transition hover:text-white">
                          {item.label}
                        </Link>
                      ) : item.section ? (
                        <button
                          type="button"
                          onClick={() => scrollToSection(item.section!)}
                          className="text-slate-300 transition hover:text-white"
                        >
                          {item.label}
                        </button>
                      ) : (
                        <a href={item.href} className="text-slate-300 transition hover:text-white">
                          {item.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col-reverse items-center justify-between gap-4 border-t border-white/5 py-8 md:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} IronPulse Strength Co. All rights reserved.
          </p>
          <p className="text-xs text-slate-500">
            Crafted with intent. Built for lifters.
          </p>
        </div>
      </div>
    </footer>
  )
}
