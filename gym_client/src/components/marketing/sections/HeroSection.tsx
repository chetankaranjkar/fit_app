import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { motion } from 'framer-motion'
import { scrollToSection } from '../../../lib/animations/useSmoothScroll'

const SOCIAL_AVATARS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80&auto=format&fit=crop',
]

const TRUST_METRICS = [
  { value: '500+', label: 'Active Members' },
  { value: '4.9★', label: 'Rating' },
  { value: '15+', label: 'Expert Trainers' },
]

export function HeroSection() {
  const rootRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      if (prefersReduced) {
        gsap.set('[data-hero]', { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' })
        gsap.set('[data-hero-cta] button', { opacity: 1, y: 0 })
        return
      }

      // Entrance timeline
      const tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
        onComplete: () => {
          gsap.set('[data-hero-cta] button', { opacity: 1, y: 0, clearProps: 'opacity,transform' })
        },
      })
      tl.from('[data-hero-eyebrow]', { y: 20, opacity: 0, duration: 0.7 })
        .from(
          '[data-hero-title] .line > span',
          { yPercent: 115, duration: 1.1, stagger: 0.09 },
          '-=0.35',
        )
        .from('[data-hero-sub]', { y: 22, opacity: 0, duration: 0.8 }, '-=0.55')
        .fromTo(
          '[data-hero-cta] button',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'expo.out' },
          '-=0.5',
        )
        .from('[data-hero-proof]', { y: 18, opacity: 0, duration: 0.7 }, '-=0.45')
        .from('[data-hero-card]', { y: 28, opacity: 0, duration: 0.8, stagger: 0.12 }, '-=0.7')
        .from('[data-hero-rail]', { opacity: 0, duration: 0.8 }, '-=0.6')
        .from('[data-hero-cue]', { opacity: 0, y: -10, duration: 0.6 }, '-=0.4')

      // Ensure CTAs are visible even if the timeline is interrupted (Strict Mode / scroll plugins)
      gsap.set('[data-hero-cta] button', { opacity: 1, y: 0 })

      // Slow Ken Burns zoom on the backdrop
      gsap.to('[data-hero-bg]', {
        scale: 1.12,
        duration: 16,
        ease: 'none',
        yoyo: true,
        repeat: -1,
      })

      // Mouse parallax (desktop only)
      if (window.matchMedia('(pointer: fine)').matches) {
        const layers = gsap.utils.toArray<HTMLElement>('[data-parallax]')
        const setters = layers.map((el) => ({
          el,
          depth: Number(el.dataset.parallax) || 0.02,
          x: gsap.quickTo(el, 'xPercent', { duration: 0.9, ease: 'power3.out' }),
          y: gsap.quickTo(el, 'yPercent', { duration: 0.9, ease: 'power3.out' }),
        }))

        const onMove = (e: MouseEvent) => {
          const cx = (e.clientX / window.innerWidth - 0.5) * 2
          const cy = (e.clientY / window.innerHeight - 0.5) * 2
          setters.forEach((s) => {
            s.x(cx * s.depth * 100)
            s.y(cy * s.depth * 100)
          })
        }
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
      }
    }, node)

    return () => ctx.revert()
  }, [])

  // Headline split into lines, each line clipped for a reveal-from-mask effect.
  // The final TIGER line is rendered oversized for maximum impact.
  const lines: Array<{ words: Array<{ text: string; gold?: boolean }>; big?: boolean }> = [
    { words: [{ text: 'Unleash' }] },
    { words: [{ text: 'Your' }, { text: 'Inner' }] },
    { words: [{ text: 'Tiger', gold: true }], big: true },
  ]

  return (
    <section
      ref={rootRef}
      id="hero"
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden"
    >
      {/* ---- Background layers ---- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-30 overflow-hidden">
        <img
          data-hero-bg
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=2400&q=90&auto=format&fit=crop"
          alt=""
          loading="eager"
          fetchPriority="high"
          className="h-full w-full origin-center object-cover will-change-transform"
        />
      </div>

      {/* Cinematic overlays */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_15%_85%,rgba(245,196,0,0.20),transparent_60%)]" />
        {/* Vignette */}
        <div className="absolute inset-0 shadow-[inset_0_0_240px_60px_rgba(0,0,0,0.85)]" />
      </div>

      {/* Floating gold orb + tiger stripes + watermark logo (parallax) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          data-parallax="0.05"
          className="absolute right-[8%] top-[18%] size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(245,196,0,0.22),transparent_62%)] blur-3xl"
        />
        <div data-parallax="0.03" className="absolute inset-0 opacity-60 tiger-stripes" />

        {/* Oversized tiger watermark — drifts top-left → bottom-right, then holds */}
        <div data-parallax="0.02" className="absolute inset-0">
          <img
            src="/tiger-fitness-logo.png"
            alt=""
            className="animate-tiger-watermark-drift absolute left-1/2 top-1/2 w-[120vw] max-w-[1100px] object-contain opacity-[0.06] blur-[2px] sm:w-[80vw] lg:w-[55vw]"
          />
        </div>
      </div>

      {/* ---- Vertical brand rail (left) ---- */}
      <div
        data-hero
        data-hero-rail
        className="pointer-events-none absolute left-5 top-1/2 hidden -translate-y-1/2 lg:block"
      >
        <div className="flex flex-col items-center gap-5">
          <span className="h-20 w-px bg-gradient-to-b from-transparent via-[#F5C400]/70 to-transparent" />
          <span className="font-display rotate-180 text-[11px] uppercase tracking-[0.5em] text-[#F5C400]/80 [writing-mode:vertical-rl]">
            Train Like A Tiger
          </span>
          <span className="h-20 w-px bg-gradient-to-b from-transparent via-[#F5C400]/70 to-transparent" />
        </div>
      </div>

      {/* ---- Main content ---- */}
      <div className="relative mx-auto w-full max-w-7xl px-5 pb-16 pt-32 sm:px-8 sm:pb-24">
        <div className="grid items-end gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left copy */}
          <div>
            <span
              data-hero
              data-hero-eyebrow
              className="font-display inline-flex items-center gap-2.5 rounded-full border border-[rgba(245,196,0,0.4)] bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#F5C400] backdrop-blur"
            >
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#F5C400]/70" />
                <span className="relative size-2 rounded-full bg-[#F5C400]" />
              </span>
              Now enrolling · 2026 intake
            </span>

            <h1
              data-hero
              data-hero-title
              className="font-display mt-7 text-balance font-bold uppercase leading-[0.82] tracking-[0.005em] text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
            >
              {lines.map((line, li) => (
                <span
                  key={li}
                  className={`line block overflow-hidden pb-[0.06em] ${
                    line.big
                      ? 'text-[5rem] leading-[0.8] sm:text-[8.5rem] lg:text-[11rem]'
                      : 'text-[2.4rem] sm:text-5xl lg:text-6xl'
                  }`}
                >
                  <span className="inline-block">
                    {line.words.map((w, wi) => (
                      <span
                        key={wi}
                        className={
                          w.gold
                            ? 'gradient-tiger-text pr-[0.12em] [-webkit-text-stroke:0]'
                            : 'pr-[0.18em]'
                        }
                      >
                        {w.text}
                      </span>
                    ))}
                  </span>
                </span>
              ))}
            </h1>

            <p
              data-hero
              data-hero-sub
              className="mt-7 max-w-xl text-base leading-relaxed text-[#C8C8C8] sm:text-lg"
            >
              Transform your body with expert coaching, structured training, and
              measurable progress. Tiger Fitness is the premium gym experience
              built for athletes who refuse to plateau.
            </p>

            <div
              data-hero-cta
              className="relative z-20 mt-10 flex w-full max-w-md flex-col gap-4 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center"
            >
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="hero-cta-primary group relative inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 font-sans text-[13px] font-bold uppercase tracking-wide text-black transition hover:scale-[1.02] active:scale-[0.98] sm:w-auto sm:px-8 sm:text-sm"
              >
                <span className="text-center leading-snug">Start Your Transformation</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('plans')}
                className="hero-cta-secondary group relative inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full border-2 border-white/30 bg-[#141414]/90 px-6 py-3.5 font-sans text-[13px] font-bold uppercase tracking-wide text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)] transition hover:border-[#F5C400] hover:bg-[#1a1a1a] active:scale-[0.98] sm:w-auto sm:px-8 sm:text-sm"
              >
                <span className="text-center leading-snug">View Membership Plans</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  className="size-4 shrink-0 text-[#F5C400] transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>

            {/* Social proof */}
            <div
              data-hero
              data-hero-proof
              className="mt-10 flex items-center gap-4"
            >
              <div className="flex -space-x-3">
                {SOCIAL_AVATARS.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    loading="lazy"
                    className="size-10 rounded-full border-2 border-black object-cover ring-1 ring-[rgba(245,196,0,0.4)]"
                  />
                ))}
                <span className="flex size-10 items-center justify-center rounded-full border-2 border-black bg-[rgba(245,196,0,0.15)] text-[10px] font-bold text-[#F5C400]">
                  +5K
                </span>
              </div>
              <div className="h-9 w-px bg-white/15" />
              <div>
                <div className="flex items-center gap-1 text-[#F5C400]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-sm" style={{ textShadow: '0 0 8px rgba(245,196,0,0.5)' }}>★</span>
                  ))}
                </div>
                <p className="mt-0.5 text-xs text-[#B0B0B0]">
                  Trusted by <span className="font-semibold text-white">5,000+ athletes</span>
                </p>
              </div>
            </div>

            {/* Trust metrics */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
              }}
              className="mt-10 grid max-w-xl grid-cols-3 gap-3 sm:gap-4"
            >
              {TRUST_METRICS.map((m) => (
                <motion.div
                  key={m.label}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
                  }}
                  className="group rounded-2xl border border-[rgba(245,196,0,0.18)] bg-[#0a0a0a]/60 px-3 py-4 text-center backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(245,196,0,0.5)] hover:shadow-[0_18px_40px_-18px_rgba(245,196,0,0.55)] sm:px-4"
                >
                  <p className="gradient-tiger-text font-display text-3xl font-bold leading-none sm:text-4xl">
                    {m.value}
                  </p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a] sm:text-[11px]">
                    {m.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right — featured athlete card with anchored glass stats */}
          <div
            data-parallax="0.02"
            className="relative mx-auto hidden w-full max-w-lg lg:-mt-56 lg:ml-auto lg:-mr-24 lg:block"
          >
            {/* Ambient glow behind the stack */}
            <div aria-hidden className="absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_70%_30%,rgba(245,196,0,0.22),transparent_65%)] blur-2xl" />

            {/* Featured athlete image */}
            <div
              data-hero
              data-hero-card
              className="relative aspect-[3/4] w-full overflow-hidden rounded-[2rem] border border-[rgba(245,196,0,0.3)] bg-[#0a0a0a] shadow-[0_40px_90px_-30px_rgba(245,196,0,0.5)]"
            >
              <img
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1100&q=85&auto=format&fit=crop"
                alt="Athlete performing a core workout at Tiger Fitness"
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(245,196,0,0.12)] to-transparent mix-blend-overlay" />

              {/* Top: live status */}
              <div
                data-hero
                data-hero-card
                data-parallax="0.03"
                className="absolute inset-x-4 top-4 flex items-center justify-between rounded-xl border border-[rgba(245,196,0,0.25)] bg-black/55 px-3.5 py-2.5 backdrop-blur-xl"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-white">
                  <span className="relative flex size-2">
                    <span className="absolute inset-0 animate-ping rounded-full bg-[#F5C400]/80" />
                    <span className="relative size-2 rounded-full bg-[#F5C400]" />
                  </span>
                  Live now
                </span>
                <span className="font-display text-[11px] uppercase tracking-[0.2em] text-[#F5C400]">
                  14 lifting
                </span>
              </div>

              {/* Bottom: PR highlight */}
              <div
                data-hero
                data-hero-card
                data-parallax="0.04"
                className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-2xl border border-[rgba(245,196,0,0.3)] bg-black/65 p-3.5 backdrop-blur-xl"
              >
                <div className="font-display flex size-12 items-center justify-center rounded-xl gradient-tiger text-sm font-bold tracking-wider text-black">
                  PR
                </div>
                <div className="min-w-0">
                  <p className="font-display text-2xl font-bold leading-none text-white">+22kg</p>
                  <p className="mt-1 truncate text-[11px] text-[#B0B0B0]">Back-squat · this month</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="ml-auto size-5 shrink-0 text-[#F5C400]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M21 7V3h-4" />
                </svg>
              </div>
            </div>

            {/* Floating rating chip — overlaps the card edge */}
            <div
              data-hero
              data-hero-card
              data-parallax="0.07"
              className="absolute -left-6 top-24 flex items-center gap-3 rounded-2xl border border-[rgba(245,196,0,0.3)] bg-black/70 p-3.5 backdrop-blur-xl tiger-glow-soft"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-[rgba(245,196,0,0.15)] text-lg text-[#F5C400]">★</div>
              <div>
                <p className="font-display text-xl font-bold leading-none text-white">4.9</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#888]">Top 1% · India</p>
              </div>
            </div>

            {/* Floating activity sparkline — overlaps the card edge */}
            <div
              data-hero
              data-hero-card
              data-parallax="0.06"
              className="absolute -right-5 bottom-28 w-40 rounded-2xl border border-[rgba(245,196,0,0.3)] bg-black/70 p-3.5 backdrop-blur-xl tiger-glow-soft"
            >
              <p className="font-display text-[10px] uppercase tracking-[0.18em] text-[#888]">Studio activity</p>
              <div className="mt-2 flex h-10 items-end gap-1">
                {[40, 65, 50, 80, 60, 95, 72].map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-sm gradient-tiger"
                    style={{ height: `${h}%`, opacity: 0.5 + i / 14 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Scroll cue ---- */}
      <button
        type="button"
        data-hero
        data-hero-cue
        onClick={() => scrollToSection('features')}
        aria-label="Scroll to explore"
        className="group absolute bottom-24 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
      >
        <span className="font-display text-[10px] uppercase tracking-[0.4em] text-white/60 transition group-hover:text-[#F5C400]">
          Scroll
        </span>
        <span className="flex h-9 w-5 items-start justify-center rounded-full border border-white/25 p-1 transition group-hover:border-[#F5C400]">
          <span className="block h-2 w-0.5 animate-bounce rounded-full bg-[#F5C400]" />
        </span>
      </button>

      {/* ---- Marquee tagline strip ---- */}
      <div className="relative z-10 overflow-hidden border-y border-[rgba(245,196,0,0.18)] bg-black/50 py-3.5 backdrop-blur">
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap font-display text-xs uppercase tracking-[0.4em] text-[#F5C400]/75">
          {[0, 1].map((half) => (
            <div key={half} aria-hidden={half === 1} className="flex gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className="flex items-center gap-8">
                  <span>Train Like A Tiger</span>
                  <span className="text-[#F5C400]/40">✦</span>
                  <span>Premium Coaching</span>
                  <span className="text-[#F5C400]/40">✦</span>
                  <span>Measurable Progress</span>
                  <span className="text-[#F5C400]/40">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
