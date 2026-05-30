import { Link } from 'react-router-dom'
import { scrollToSection } from '../../lib/animations/useSmoothScroll'
import { TigerLogo } from './TigerLogo'

const FOOTER_LINKS: Array<{ title: string; items: Array<{ label: string; href?: string; to?: string; section?: string }> }> = [
  {
    title: 'Train',
    items: [
      { label: 'Features', section: 'features' },
      { label: 'Trainers', section: 'trainers' },
      { label: 'Transformations', section: 'gallery' },
      { label: 'Facility', section: 'facility' },
    ],
  },
  {
    title: 'Member',
    items: [
      { label: 'Plans', section: 'plans' },
      { label: 'Mobile App', section: 'app' },
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

const SOCIALS = [
  {
    label: 'Instagram',
    d: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.5.4 1.2.4 2.3.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.5.2-1.2.4-2.3.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.9-.2-2.3-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.5-.4-1.2-.4-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.9.4-2.3.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.5-.2 1.2-.4 2.3-.4C8.4 2.2 8.8 2.2 12 2.2zm0 5.4a4.4 4.4 0 100 8.8 4.4 4.4 0 000-8.8zm5.6-.4a1 1 0 100 2 1 1 0 000-2zM12 9.4a2.6 2.6 0 110 5.2 2.6 2.6 0 010-5.2z',
  },
  {
    label: 'Twitter',
    d: 'M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.4-1.3 1.7-2.2-.8.4-1.6.7-2.5.9a3.9 3.9 0 00-6.7 3.6A11 11 0 013 4.8a3.9 3.9 0 001.2 5.2c-.6 0-1.2-.2-1.7-.5v.1c0 1.9 1.4 3.5 3.1 3.8-.6.2-1.3.2-1.9.1.5 1.6 2 2.7 3.8 2.8A7.9 7.9 0 012 18.3a11 11 0 006 1.8c7.2 0 11.1-6 11.1-11.1v-.5c.8-.5 1.5-1.2 2-2z',
  },
  {
    label: 'YouTube',
    d: 'M23.5 6.5a3 3 0 00-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.4A3 3 0 00.5 6.5C.1 8.4.1 12 .1 12s0 3.6.4 5.5a3 3 0 002.1 2.1c1.9.4 9.4.4 9.4.4s7.5 0 9.4-.4a3 3 0 002.1-2.1c.4-1.9.4-5.5.4-5.5s0-3.6-.4-5.5zM9.8 15.6V8.4l6.2 3.6-6.2 3.6z',
  },
]

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-[rgba(245,196,0,0.18)] bg-black pt-16">
      {/* Top hairline */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,196,0,0.6)] to-transparent" />
      {/* Faint stripe texture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50 tiger-stripes" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Contact band: map + hours + quick contact */}
        <div className="mb-16 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Google Map */}
          <div className="relative overflow-hidden rounded-3xl border border-[rgba(245,196,0,0.2)] bg-[#0a0a0a]">
            <iframe
              title="Tiger Fitness location"
              src="https://www.google.com/maps?q=Ceejay+House+Worli+Mumbai&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-72 w-full grayscale-[0.4] contrast-[1.1] sm:h-full sm:min-h-[20rem]"
              style={{ border: 0, filter: 'invert(0.9) hue-rotate(180deg)' }}
              allowFullScreen
            />
          </div>

          {/* Hours + contact + CTAs */}
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-[rgba(245,196,0,0.2)] bg-[#0a0a0a]/70 p-6 backdrop-blur">
              <h4 className="font-display flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-[#F5C400]">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Business Hours
              </h4>
              <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-[#B0B0B0]">
                <span>Mon – Fri</span>
                <span className="text-right text-white">5:00 am – 11:00 pm</span>
                <span>Saturday</span>
                <span className="text-right text-white">6:00 am – 9:00 pm</span>
                <span>Sunday</span>
                <span className="text-right text-white">6:00 am – 9:00 pm</span>
              </div>
              <div className="mt-4 flex items-start gap-2 border-t border-[rgba(245,196,0,0.12)] pt-4 text-sm text-[#B0B0B0]">
                <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-[#F5C400]" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a3 3 0 100-6 3 3 0 000 6zM12 22s8-8 8-14a8 8 0 10-16 0c0 6 8 14 8 14z" />
                </svg>
                5th Floor, Ceejay House, Worli, Mumbai 400018
              </div>
              <a href="tel:+919999999999" className="mt-2 flex items-center gap-2 text-sm text-[#B0B0B0] transition hover:text-white">
                <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-[#F5C400]" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.3a1 1 0 01.95.68l1 3a1 1 0 01-.25 1l-1.5 1.5a14 14 0 006.07 6.07l1.5-1.5a1 1 0 011-.25l3 1a1 1 0 01.68.95V19a2 2 0 01-2 2A16 16 0 013 5z" />
                </svg>
                +91 99999 99999
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <a
                href="https://wa.me/919999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-3.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-[#25D366] transition hover:bg-[#25D366]/20"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                  <path d="M17.6 6.32A7.92 7.92 0 0012.06 4h-.01a7.94 7.94 0 00-6.88 11.88L4 20l4.26-1.12a7.94 7.94 0 003.8.97h.01c4.38 0 7.94-3.56 7.94-7.94a7.88 7.88 0 00-2.41-5.59z" />
                </svg>
                WhatsApp
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-2 rounded-2xl border border-[rgba(245,196,0,0.3)] bg-[rgba(245,196,0,0.08)] px-4 py-3.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-[#F5C400] transition hover:bg-[rgba(245,196,0,0.16)]"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                  <path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.5.4 1.2.4 2.3.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.5.2-1.2.4-2.3.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.9-.2-2.3-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.5-.4-1.2-.4-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.9.4-2.3.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.5-.2 1.2-.4 2.3-.4C8.4 2.2 8.8 2.2 12 2.2zm0 5.4a4.4 4.4 0 100 8.8 4.4 4.4 0 000-8.8zm5.6-.4a1 1 0 100 2 1 1 0 000-2zM12 9.4a2.6 2.6 0 110 5.2 2.6 2.6 0 010-5.2z" />
                </svg>
                Instagram
              </a>
            </div>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[2fr_3fr]">
          {/* Brand */}
          <div>
            <Link to="/" aria-label="Tiger Fitness — home" className="inline-flex">
              <TigerLogo variant="stacked" size={40} />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#B0B0B0]">
              Tiger Fitness is a premium luxury gym experience — expert coaching,
              structured training, and measurable progress for athletes who want
              more than a treadmill.
            </p>
            <p className="mt-4 font-display text-sm uppercase tracking-[0.3em] text-[#F5C400]">
              Train Like A Tiger.
            </p>
            <div className="mt-6 flex gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex size-10 items-center justify-center rounded-full border border-[rgba(245,196,0,0.2)] bg-white/[0.03] text-white/70 transition hover:border-[#F5C400] hover:text-[#F5C400]"
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
                <h4 className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-[#F5C400]">
                  {group.title}
                </h4>
                <ul className="mt-4 space-y-3 text-sm">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      {item.to ? (
                        <Link to={item.to} className="text-[#B0B0B0] transition hover:text-white">
                          {item.label}
                        </Link>
                      ) : item.section ? (
                        <button
                          type="button"
                          onClick={() => scrollToSection(item.section!)}
                          className="text-[#B0B0B0] transition hover:text-white"
                        >
                          {item.label}
                        </button>
                      ) : (
                        <a href={item.href} className="text-[#B0B0B0] transition hover:text-white">
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

        <div className="mt-16 flex flex-col-reverse items-center justify-between gap-4 border-t border-[rgba(245,196,0,0.15)] py-8 md:flex-row">
          <p className="text-xs text-[#888]">
            © {new Date().getFullYear()} Tiger Fitness. All rights reserved.
          </p>
          <p className="text-xs text-[#888]">
            Built for athletes. Crafted for legends.
          </p>
        </div>
      </div>
    </footer>
  )
}
