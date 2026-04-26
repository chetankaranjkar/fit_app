import { useCallback, useRef } from 'react'
import { useRevealOnScroll } from '../../../lib/animations/useRevealOnScroll'
import { SectionHeader } from '../SectionHeader'
import { scrollToSection } from '../../../lib/animations/useSmoothScroll'

interface Program {
  id: string
  title: string
  tagline: string
  description: string
  image: string
  accent: string // tailwind gradient colors e.g. "from-blue-500 to-cyan-400"
  iconBg: string
  icon: React.ReactNode
  sessionsPerWeek: string
  duration: string
  intensity: 1 | 2 | 3 | 4 | 5
  fromPrice: string
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'
  perks: string[]
  featured?: boolean
}

const PROGRAMS: Program[] = [
  {
    id: 'performance',
    title: 'Performance',
    tagline: 'Our signature program',
    description:
      'Data-driven coaching with weekly programming tuned to your lifts, recovery, and life load. Small-group pods keep you accountable; one-on-one check-ins keep you moving forward.',
    image:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=85&auto=format&fit=crop',
    accent: 'from-blue-500 via-purple-500 to-fuchsia-500',
    iconBg: 'bg-gradient-to-br from-blue-500 to-purple-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h8l-1 8 10-12h-8z" />
      </svg>
    ),
    sessionsPerWeek: '4–6 / wk',
    duration: '12 week blocks',
    intensity: 4,
    fromPrice: '₹5,999',
    level: 'All Levels',
    perks: ['Weekly programming', 'Recovery suite', 'InBody + scans', 'Nutrition guidance'],
    featured: true,
  },
  {
    id: 'strength',
    title: 'Strength Lab',
    tagline: 'Powerlifting focused',
    description:
      'Periodised programming with weekly load autoregulation and form video review. Build a base that compounds for years.',
    image:
      'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1000&q=80&auto=format&fit=crop',
    accent: 'from-blue-500 to-cyan-400',
    iconBg: 'bg-blue-500/20 ring-blue-400/30',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18M4 12h2M18 12h2" />
      </svg>
    ),
    sessionsPerWeek: '3–5 / wk',
    duration: '16 wk cycle',
    intensity: 5,
    fromPrice: '₹4,499',
    level: 'Intermediate',
    perks: ['1-on-1 coaching', 'Velocity-based training', 'Competition prep'],
  },
  {
    id: 'hyrox',
    title: 'HYROX',
    tagline: 'Race conditioning',
    description:
      'Sled, ski-erg, wall-balls. Energy-system-first conditioning for first-timers and podium chasers alike.',
    image:
      'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1000&q=80&auto=format&fit=crop',
    accent: 'from-fuchsia-500 to-pink-500',
    iconBg: 'bg-fuchsia-500/20 ring-fuchsia-400/30',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 0118 0M3 12a9 9 0 009 9M3 12h18M12 3v18" />
      </svg>
    ),
    sessionsPerWeek: '4 / wk',
    duration: '12 wk race prep',
    intensity: 5,
    fromPrice: '₹6,499',
    level: 'Advanced',
    perks: ['Race-day pacing', 'Sport-specific GPP', 'Podium coaching'],
  },
  {
    id: 'hypertrophy',
    title: 'Hypertrophy',
    tagline: 'Physique focused',
    description:
      'Science-backed splits, progressive overload, and recomp nutrition — the fastest route to a body you like seeing.',
    image:
      'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=1000&q=80&auto=format&fit=crop',
    accent: 'from-rose-500 to-orange-500',
    iconBg: 'bg-rose-500/20 ring-rose-400/30',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
    sessionsPerWeek: '4–6 / wk',
    duration: '8 wk mesocycle',
    intensity: 4,
    fromPrice: '₹4,999',
    level: 'All Levels',
    perks: ['Macro coaching', 'Body comp scans', 'Weekly check-ins'],
  },
  {
    id: 'mobility',
    title: 'Mobility & Recovery',
    tagline: 'Train hard, recover harder',
    description:
      'Soft-tissue work, breathwork, contrast therapy, and sleep coaching. The invisible edge behind every PR.',
    image:
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1000&q=80&auto=format&fit=crop',
    accent: 'from-emerald-400 to-teal-500',
    iconBg: 'bg-emerald-500/20 ring-emerald-400/30',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    sessionsPerWeek: 'Daily',
    duration: 'Rolling access',
    intensity: 2,
    fromPrice: '₹2,999',
    level: 'Beginner',
    perks: ['Contrast therapy', 'Breath coaching', 'Sauna + ice'],
  },
  {
    id: 'sport',
    title: 'Sport Performance',
    tagline: 'For athletes',
    description:
      'Sport-specific periodisation — cricket, football, combat. Speed, power, injury-proofing, competition prep.',
    image:
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1000&q=80&auto=format&fit=crop',
    accent: 'from-amber-400 to-orange-500',
    iconBg: 'bg-amber-500/20 ring-amber-400/30',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
      </svg>
    ),
    sessionsPerWeek: '3–5 / wk',
    duration: 'Season-based',
    intensity: 5,
    fromPrice: 'Custom',
    level: 'Advanced',
    perks: ['VO₂ testing', 'Return-to-play', 'Travel planning'],
  },
]

function IntensityMeter({ value, accent }: { value: number; accent: string }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-4 rounded-full transition-colors ${
            i <= value ? `bg-gradient-to-r ${accent}` : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}

/** Card that tracks the mouse and reveals a soft spotlight glow. */
function useSpotlight() {
  const ref = useRef<HTMLDivElement | null>(null)
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }, [])
  return { ref, onMove }
}

function FeaturedCard({ p }: { p: Program }) {
  const { ref, onMove } = useSpotlight()
  return (
    <article
      ref={ref}
      onMouseMove={onMove}
      data-program
      className="program-featured group relative isolate flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c1f] p-7 shadow-[0_30px_80px_-30px_rgba(139,92,246,0.4)] transition-transform duration-500 hover:-translate-y-1 md:col-span-2 lg:min-h-[30rem]"
    >
      {/* Background image */}
      <img
        src={p.image}
        alt=""
        loading="lazy"
        className="absolute inset-0 -z-20 h-full w-full object-cover opacity-60 transition duration-700 group-hover:scale-[1.06] group-hover:opacity-75"
      />
      {/* Scrim */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[rgba(5,6,16,0.85)] via-[rgba(5,6,16,0.72)] to-[rgba(5,6,16,0.95)]" />
      {/* Mouse spotlight */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(520px circle at var(--mx,50%) var(--my,50%), rgba(139,92,246,0.18), transparent 55%)',
        }}
      />
      {/* Accent rim on hover */}
      <div className={`absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br ${p.accent} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-20`} />

      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex size-12 items-center justify-center rounded-xl text-white ring-1 ${p.iconBg} shadow-lg`}>
            {p.icon}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              {p.tagline}
            </p>
            <h3 className="text-2xl font-bold text-white sm:text-3xl">{p.title}</h3>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-[linear-gradient(135deg,#3b82f6,#a855f7)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_6px_18px_-6px_rgba(139,92,246,0.7)]">
          Flagship
        </span>
      </div>

      {/* Description */}
      <p className="mt-6 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
        {p.description}
      </p>

      {/* Meta grid */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Meta label="Sessions" value={p.sessionsPerWeek} />
        <Meta label="Block" value={p.duration} />
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Intensity</p>
          <div className="mt-2">
            <IntensityMeter value={p.intensity} accent={p.accent} />
          </div>
        </div>
        <Meta label="From" value={`${p.fromPrice}/mo`} strong />
      </div>

      {/* Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-5">
        <div className="flex flex-wrap gap-1.5">
          {p.perks.map((perk) => (
            <span
              key={perk}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-200"
            >
              <span className={`size-1.5 rounded-full bg-gradient-to-r ${p.accent}`} />
              {perk}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollToSection('plans')}
          className="group/cta inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
        >
          Explore plan
          <svg viewBox="0 0 24 24" className="size-4 transition-transform group-hover/cta:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </article>
  )
}

function ProgramCard({ p }: { p: Program }) {
  const { ref, onMove } = useSpotlight()
  return (
    <article
      ref={ref}
      onMouseMove={onMove}
      data-program
      className="group relative isolate flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] transition-all duration-500 hover:-translate-y-1 hover:border-white/15"
    >
      {/* Image banner */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={p.image}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.08]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(5,6,16,0.96)] via-[rgba(5,6,16,0.4)] to-transparent" />

        {/* Top-left icon */}
        <div className={`absolute left-4 top-4 flex size-10 items-center justify-center rounded-xl text-white ring-1 backdrop-blur ${p.iconBg}`}>
          {p.icon}
        </div>

        {/* Top-right level pill */}
        <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-[rgba(5,6,16,0.65)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
          {p.level}
        </span>

        {/* Bottom-left title */}
        <div className="absolute inset-x-4 bottom-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-300">
            {p.tagline}
          </p>
          <h3 className="mt-0.5 text-xl font-bold text-white">{p.title}</h3>
        </div>
      </div>

      {/* Mouse spotlight overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(360px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.06), transparent 50%)',
        }}
      />

      {/* Body */}
      <div className="relative flex flex-1 flex-col p-5">
        <p className="text-sm leading-relaxed text-slate-400">{p.description}</p>

        {/* Meta row */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Meta label="Sessions" value={p.sessionsPerWeek} />
          <Meta label="Block" value={p.duration} />
        </div>

        {/* Intensity */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Intensity
          </span>
          <IntensityMeter value={p.intensity} accent={p.accent} />
        </div>

        {/* Perks — reveal on hover */}
        <div className="mt-4 grid max-h-0 grid-cols-1 gap-1 overflow-hidden opacity-0 transition-all duration-500 group-hover:max-h-48 group-hover:opacity-100">
          {p.perks.map((perk) => (
            <div key={perk} className="flex items-center gap-2 text-xs text-slate-300">
              <span className="flex size-4 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                <svg viewBox="0 0 24 24" className="size-2.5" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {perk}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">From</p>
            <p className={`bg-gradient-to-r ${p.accent} bg-clip-text text-xl font-bold text-transparent`}>
              {p.fromPrice}
              {p.fromPrice !== 'Custom' && <span className="text-slate-500 text-xs font-medium"> /mo</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection('plans')}
            className="group/cta inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.08]"
          >
            Explore
            <svg viewBox="0 0 24 24" className="size-3.5 transition-transform group-hover/cta:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        {/* Accent underline that fills on hover */}
        <div className={`absolute inset-x-5 bottom-0 h-px bg-gradient-to-r ${p.accent} origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100`} />
      </div>
    </article>
  )
}

function Meta({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm ${strong ? 'font-bold text-white' : 'font-semibold text-slate-200'}`}>
        {value}
      </p>
    </div>
  )
}

export function ProgramsSection() {
  const gridRef = useRevealOnScroll<HTMLDivElement>({
    variant: 'up',
    selector: '[data-program]',
    stagger: 0.1,
  })

  const featured = PROGRAMS.find((p) => p.featured)!
  const rest = PROGRAMS.filter((p) => !p.featured)

  return (
    <section id="programs" className="relative py-28 sm:py-36">
      {/* Decorative edge accents */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Programs"
          title="Programs built around"
          highlight="your outcome"
          subtitle="Every member starts with a 60-minute assessment. Your program is tuned — not templated — to your goals, schedule, and recovery profile."
        />

        {/* KPI strip */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-3 sm:gap-6">
          {[
            { v: '6', l: 'Program tracks' },
            { v: '98%', l: 'Retention' },
            { v: '4.9★', l: 'Avg member rating' },
          ].map((k) => (
            <div
              key={k.l}
              className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 text-center backdrop-blur sm:px-4 sm:py-4"
            >
              <p className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
                {k.v}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">
                {k.l}
              </p>
            </div>
          ))}
        </div>

        {/* Bento grid */}
        <div
          ref={gridRef}
          className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:auto-rows-fr"
        >
          <FeaturedCard p={featured} />
          {rest.map((p) => (
            <ProgramCard key={p.id} p={p} />
          ))}
        </div>

        {/* Footer caption */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur md:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80&auto=format&fit=crop',
              ].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="size-9 rounded-full border-2 border-[#05060e] object-cover"
                />
              ))}
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-[#05060e] bg-white/10 text-[10px] font-bold text-white">
                +240
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Not sure which fits?</p>
              <p className="text-xs text-slate-400">
                Talk to a coach — 60s · no commitment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection('contact')}
            className="group relative overflow-hidden rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(139,92,246,0.6)] transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)]" />
            <span className="relative flex items-center gap-2">
              Find my program
              <svg viewBox="0 0 24 24" className="size-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}
