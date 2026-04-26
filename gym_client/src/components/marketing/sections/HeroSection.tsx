import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { scrollToSection } from '../../../lib/animations/useSmoothScroll'

export function HeroSection() {
  const rootRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      if (prefersReduced) {
        gsap.set('[data-hero]', { opacity: 1, y: 0 })
        return
      }
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('[data-hero-eyebrow]', { y: 18, opacity: 0, duration: 0.8 })
        .from('[data-hero-title] .word', { y: 56, opacity: 0, duration: 1.1, stagger: 0.08 }, '-=0.4')
        .from('[data-hero-sub]', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('[data-hero-cta] > *', { y: 16, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.5')
        .from('[data-hero-stat]', { y: 20, opacity: 0, duration: 0.7, stagger: 0.08 }, '-=0.4')
        .from('[data-hero-visual]', { scale: 0.96, opacity: 0, duration: 1.2 }, '-=1.1')
    }, node)

    return () => ctx.revert()
  }, [])

  const titleWords = ['Forge', 'the', 'strongest', 'version', 'of', 'you.']

  return (
    <section
      ref={rootRef}
      id="hero"
      className="relative isolate flex min-h-[92svh] items-center overflow-hidden pt-24 sm:pt-28"
    >
      {/* Animated gradient blobs behind hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(96,165,250,0.25),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-[32rem] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.22),transparent_60%)] blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 pb-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Left copy */}
        <div className="text-center lg:text-left">
          <span
            data-hero
            data-hero-eyebrow
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 backdrop-blur"
          >
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative size-2 rounded-full bg-emerald-400" />
            </span>
            Now accepting spring intake
          </span>

          <h1
            data-hero
            data-hero-title
            className="mt-6 text-balance text-[2.5rem] font-bold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-[4.25rem]"
          >
            {titleWords.map((w, i) => (
              <span key={i} className="word inline-block pr-[0.25em]">
                {i === 2 ? (
                  <span className="bg-[linear-gradient(135deg,#60a5fa_0%,#a78bfa_50%,#e879f9_100%)] bg-clip-text text-transparent">
                    {w}
                  </span>
                ) : (
                  w
                )}
              </span>
            ))}
          </h1>

          <p
            data-hero
            data-hero-sub
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg lg:mx-0"
          >
            A private coaching studio with data-driven programs, world-class
            trainers, and a recovery stack that keeps you building — session
            after session.
          </p>

          <div
            data-hero
            data-hero-cta
            className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <button
              type="button"
              onClick={() => scrollToSection('plans')}
              className="group relative overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_14px_40px_-10px_rgba(139,92,246,0.65)] transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="absolute inset-0 bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)]" />
              <span className="absolute inset-0 translate-y-full bg-[linear-gradient(135deg,#60a5fa_0%,#a78bfa_50%,#e879f9_100%)] transition-transform duration-500 group-hover:translate-y-0" />
              <span className="relative flex items-center gap-2">
                Join now
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-4 transition-transform group-hover:translate-x-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('contact')}
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 text-slate-300">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 8l6 4-6 4V8z" />
              </svg>
              Book a free trial
            </button>
          </div>

          {/* Hero stats */}
          <div className="mt-12 grid grid-cols-3 gap-3 sm:gap-6">
            {[
              { v: '2.4k+', l: 'Active members' },
              { v: '4.9★', l: '300+ reviews' },
              { v: '24/7', l: 'Studio access' },
            ].map((s) => (
              <div
                key={s.l}
                data-hero
                data-hero-stat
                className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur"
              >
                <p className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                  {s.v}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right visual — stacked glass panels */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div data-hero data-hero-visual className="relative aspect-[4/5] w-full">
            {/* Glow ring */}
            <div className="absolute inset-8 rounded-[2.5rem] bg-[linear-gradient(135deg,#3b82f6,#8b5cf6,#a855f7)] opacity-60 blur-2xl" />

            {/* Main image card */}
            <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0a0b1e] shadow-[0_30px_80px_-30px_rgba(139,92,246,0.6)]">
              <img
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80&auto=format&fit=crop"
                alt="Athlete training in studio"
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(5,6,16,0.85)] via-transparent to-transparent" />

              {/* Floating pill — live session */}
              <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/15 bg-[rgba(7,8,20,0.7)] px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/70" />
                  <span className="relative size-2 rounded-full bg-rose-400" />
                </span>
                Live · 14 lifting now
              </div>

              {/* Floating chip bottom — PR tracker */}
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/10 bg-[rgba(7,8,20,0.72)] p-3.5 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-sm font-bold text-white">
                    PR
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">+18kg this month</p>
                    <p className="text-xs text-slate-400">Back-squat · 5-rep max</p>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-5 text-emerald-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M21 7V3h-4" />
                </svg>
              </div>
            </div>

            {/* Decorative badge card */}
            <div className="absolute -left-4 top-12 hidden rotate-[-6deg] rounded-2xl border border-white/10 bg-[rgba(7,8,20,0.8)] p-3 backdrop-blur sm:block">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
                  ★
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Rated</p>
                  <p className="text-xs font-semibold text-white">Top 1% · India</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/15 p-1">
          <span className="block h-2 w-0.5 animate-bounce rounded-full bg-white/60" />
        </div>
      </div>
    </section>
  )
}
