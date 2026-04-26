import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRevealOnScroll } from '../../../lib/animations/useRevealOnScroll'
import { SectionHeader } from '../SectionHeader'
import { scrollToSection } from '../../../lib/animations/useSmoothScroll'

interface Trainer {
  id: string
  name: string
  role: string
  photo: string
  accent: string
  specialties: string[]
  tags: string[] // broad filter tags, e.g. Strength, Conditioning
  experience: number
  clients: number
  rating: number
  reviewCount: number
  sessions: number
  bio: string
  certs: string[]
  availableNow?: boolean
  featured?: boolean
  achievements: string[]
  socials: { ig?: string; linkedin?: string; twitter?: string }
}

const TRAINERS: Trainer[] = [
  {
    id: 'arya',
    name: 'Arya Menon',
    role: 'Head Strength Coach',
    photo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=85&auto=format&fit=crop',
    accent: 'from-blue-500 via-purple-500 to-fuchsia-500',
    specialties: ['Powerlifting', 'Olympic Lifting', 'Injury Rehab'],
    tags: ['Strength', 'Rehab'],
    experience: 11,
    clients: 240,
    rating: 4.9,
    reviewCount: 128,
    sessions: 4200,
    bio: 'Former national-level powerlifter with a decade under the bar. Specialises in long-term strength arcs and return-to-lifting post-injury. Writes programs the way a chess grandmaster plays — three moves ahead.',
    certs: ['NSCA-CSCS', 'USAW-L2', 'FRC', 'Z-Health R'],
    achievements: [
      'National silver · 83kg class (2019)',
      'Coach of the Year · India PL Fed (2023)',
      'Published in J.Str.Cond.Res',
    ],
    availableNow: true,
    featured: true,
    socials: { ig: '#', linkedin: '#' },
  },
  {
    id: 'kabir',
    name: 'Kabir Shah',
    role: 'Performance Director',
    photo: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=1000&q=80&auto=format&fit=crop',
    accent: 'from-fuchsia-500 to-pink-500',
    specialties: ['HYROX', 'Conditioning', 'Sports Performance'],
    tags: ['Conditioning', 'Sport'],
    experience: 9,
    clients: 180,
    rating: 4.9,
    reviewCount: 96,
    sessions: 3100,
    bio: 'Ex cricket S&C staff. Builds race-day athletes and weekend warriors with the same energy-system-first philosophy. Stopwatch, whiteboard, and zero tolerance for skipped warm-ups.',
    certs: ['NASM-PES', 'PN-L1', 'HYROX Coach', 'ALTIS Sprint'],
    achievements: ['Podium · HYROX Mumbai (2024)', 'S&C · Ranji U-23 squad'],
    availableNow: true,
    socials: { ig: '#' },
  },
  {
    id: 'nia',
    name: 'Nia Fernandes',
    role: 'Hypertrophy Specialist',
    photo: 'https://images.unsplash.com/photo-1609899537878-88d5ba429bdf?w=1000&q=80&auto=format&fit=crop',
    accent: 'from-rose-500 to-orange-500',
    specialties: ['Hypertrophy', 'Body Recomp', 'Nutrition'],
    tags: ['Hypertrophy', 'Nutrition'],
    experience: 7,
    clients: 165,
    rating: 4.8,
    reviewCount: 112,
    sessions: 2600,
    bio: 'Evidence-based body composition coach. Known for sustainable prep protocols without the "eat less, move more" oversimplification. Will argue about RIR with you over coffee.',
    certs: ['ACE-CPT', 'ISSA-Nutritionist', 'PN-L2'],
    achievements: ['IFBB Pro Bikini prep coach (2x)', '200+ recomp cases'],
    availableNow: false,
    socials: { ig: '#' },
  },
  {
    id: 'rahul',
    name: 'Rahul Iyer',
    role: 'Mobility Lead',
    photo: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=1000&q=80&auto=format&fit=crop',
    accent: 'from-emerald-400 to-teal-500',
    specialties: ['FRC', 'Prehab', 'Breathwork'],
    tags: ['Mobility', 'Rehab'],
    experience: 8,
    clients: 140,
    rating: 4.9,
    reviewCount: 74,
    sessions: 2200,
    bio: 'Turns stiff corporate shoulders into athletic ones. Owns recovery programming and the contrast-therapy suite. Has strong (correct) opinions about breathing.',
    certs: ['FRCms', 'PRI', 'NASM-CES', 'XPT Coach'],
    achievements: ['Physio liaison · Ranji camp', 'Creator of our Daily Prep flow'],
    availableNow: true,
    socials: { ig: '#' },
  },
  {
    id: 'leah',
    name: 'Leah D’Souza',
    role: 'Running & Endurance',
    photo: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=1000&q=80&auto=format&fit=crop',
    accent: 'from-cyan-400 to-blue-500',
    specialties: ['Marathon', 'Zone 2', 'Triathlon'],
    tags: ['Conditioning', 'Sport'],
    experience: 6,
    clients: 110,
    rating: 4.8,
    reviewCount: 58,
    sessions: 1800,
    bio: 'Sub-3 marathoner. Turns "I hate running" into "I have a race next month." Specialises in building aerobic base without burning out corporate calendars.',
    certs: ['UESCA Running', 'NASM-CPT', 'TriDot L1'],
    achievements: ['Mumbai Marathon Age Group Win', '30+ athletes to sub-4'],
    availableNow: true,
    socials: { ig: '#' },
  },
  {
    id: 'dev',
    name: 'Dev Kapoor',
    role: 'Combat Coach',
    photo: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1000&q=80&auto=format&fit=crop',
    accent: 'from-amber-400 to-orange-500',
    specialties: ['Boxing', 'BJJ', 'Fight Conditioning'],
    tags: ['Combat', 'Conditioning'],
    experience: 10,
    clients: 95,
    rating: 4.9,
    reviewCount: 62,
    sessions: 2000,
    bio: 'Pro boxing background, purple-belt BJJ. Teaches combat athletes and executives alike. Sparring optional; conditioning isn’t.',
    certs: ['BWB Coach L2', 'BJJ Purple', 'USA Boxing Coach'],
    achievements: ['Cornered 4 pro fights', 'Built our Combat Conditioning track'],
    availableNow: false,
    socials: { ig: '#' },
  },
]

const FILTER_TAGS = ['All', 'Strength', 'Conditioning', 'Hypertrophy', 'Mobility', 'Sport'] as const
type FilterTag = (typeof FILTER_TAGS)[number]

/* -------------------------------------------------------------------------- */
/*  Utility hooks                                                             */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Small UI                                                                  */
/* -------------------------------------------------------------------------- */

function RatingPill({ value, count }: { value: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200 backdrop-blur">
      <svg viewBox="0 0 24 24" className="size-3 fill-amber-300" aria-hidden>
        <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.6L6 22l1.5-7.2L2 10l7.1-1.1L12 2z" />
      </svg>
      {value.toFixed(1)}
      <span className="text-amber-200/60">·{count}</span>
    </span>
  )
}

function AvailabilityDot({ available }: { available?: boolean }) {
  if (available) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 backdrop-blur">
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/70" />
          <span className="relative size-1.5 rounded-full bg-emerald-300" />
        </span>
        Available
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 backdrop-blur">
      <span className="size-1.5 rounded-full bg-slate-400" />
      Waitlist
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Featured (Lead Coach) card                                                */
/* -------------------------------------------------------------------------- */

function FeaturedTrainer({ t, onOpen }: { t: Trainer; onOpen: () => void }) {
  const { ref, onMove } = useSpotlight()
  return (
    <article
      ref={ref}
      onMouseMove={onMove}
      data-trainer
      className="group relative isolate flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c1f] p-0 shadow-[0_30px_80px_-30px_rgba(139,92,246,0.4)] transition-transform duration-500 hover:-translate-y-1 md:col-span-2 lg:min-h-[32rem] lg:flex-row"
    >
      {/* Image side */}
      <div className="relative lg:w-[55%]">
        <img
          src={t.photo}
          alt={t.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(5,6,16,0.95)] via-[rgba(5,6,16,0.35)] to-transparent lg:bg-gradient-to-r" />

        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-[linear-gradient(135deg,#3b82f6,#a855f7)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_6px_18px_-6px_rgba(139,92,246,0.7)]">
            Lead Coach
          </span>
          <AvailabilityDot available={t.availableNow} />
        </div>

        {/* Stat badge bottom-left on mobile */}
        <div className="absolute bottom-5 left-5 flex items-center gap-3 lg:hidden">
          <RatingPill value={t.rating} count={t.reviewCount} />
        </div>

        {/* min image height on mobile */}
        <div className="aspect-[4/3] lg:aspect-auto lg:h-full" />
      </div>

      {/* Content side */}
      <div className="relative flex flex-1 flex-col justify-between p-7 lg:p-10">
        {/* Mouse spotlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(480px circle at var(--mx,50%) var(--my,50%), rgba(139,92,246,0.14), transparent 55%)',
          }}
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            {t.role}
          </p>
          <h3 className="mt-1 text-3xl font-bold text-white sm:text-4xl">{t.name}</h3>

          <div className="mt-4 hidden lg:block">
            <RatingPill value={t.rating} count={t.reviewCount} />
          </div>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
            {t.bio}
          </p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {t.specialties.map((s) => (
              <span
                key={s}
                className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200`}
              >
                <span className={`size-1.5 rounded-full bg-gradient-to-r ${t.accent}`} />
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Stats + CTA */}
        <div className="mt-7">
          <div className="grid grid-cols-3 gap-3">
            <StatCell label="Experience" value={`${t.experience}y`} />
            <StatCell label="Clients" value={`${t.clients}+`} />
            <StatCell label="Sessions" value={`${(t.sessions / 1000).toFixed(1)}k`} />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {t.certs.slice(0, 3).map((c) => (
                <span
                  key={c}
                  className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-200 ring-1 ring-emerald-500/20"
                >
                  {c}
                </span>
              ))}
              {t.certs.length > 3 && (
                <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-300 ring-1 ring-white/10">
                  +{t.certs.length - 3}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpen}
                className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.08]"
              >
                View profile
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="group/cta relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_30px_-8px_rgba(139,92,246,0.6)] transition hover:scale-[1.02]"
              >
                <span className="absolute inset-0 bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)]" />
                <span className="relative flex items-center gap-1.5">
                  Book session
                  <svg viewBox="0 0 24 24" className="size-3.5 transition-transform group-hover/cta:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2.5 backdrop-blur">
      <p className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-lg font-bold text-transparent">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Standard trainer card                                                     */
/* -------------------------------------------------------------------------- */

function TrainerCard({ t, onOpen }: { t: Trainer; onOpen: () => void }) {
  const { ref, onMove } = useSpotlight()
  return (
    <article
      ref={ref}
      onMouseMove={onMove}
      data-trainer
      className="group relative isolate flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] transition-all duration-500 hover:-translate-y-1 hover:border-white/15"
    >
      {/* Photo */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={t.photo}
          alt={t.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(5,6,16,0.95)] via-[rgba(5,6,16,0.2)] to-transparent" />

        {/* Top row: availability + rating */}
        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
          <AvailabilityDot available={t.availableNow} />
          <RatingPill value={t.rating} count={t.reviewCount} />
        </div>

        {/* Bottom identity */}
        <div className="absolute inset-x-4 bottom-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300">
            {t.role}
          </p>
          <h3 className="mt-0.5 text-xl font-bold text-white">{t.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {t.specialties.slice(0, 2).map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/15 bg-[rgba(5,6,16,0.6)] px-2 py-0.5 text-[10px] font-medium text-slate-200 backdrop-blur"
              >
                {s}
              </span>
            ))}
            {t.specialties.length > 2 && (
              <span className="rounded-full border border-white/15 bg-[rgba(5,6,16,0.6)] px-2 py-0.5 text-[10px] font-medium text-slate-300 backdrop-blur">
                +{t.specialties.length - 2}
              </span>
            )}
          </div>
        </div>

        {/* Mouse spotlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(320px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.08), transparent 50%)',
          }}
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Exp" value={`${t.experience}y`} />
          <MiniStat label="Clients" value={`${t.clients}+`} />
          <MiniStat label="Sessions" value={`${(t.sessions / 1000).toFixed(1)}k`} />
        </div>

        {/* Hover reveal: bio preview + certs */}
        <div className="mt-4 max-h-0 overflow-hidden opacity-0 transition-all duration-500 group-hover:max-h-60 group-hover:opacity-100">
          <p className="line-clamp-3 text-xs leading-relaxed text-slate-400">{t.bio}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {t.certs.slice(0, 3).map((c) => (
              <span
                key={c}
                className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200 ring-1 ring-emerald-500/20"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="mt-auto flex gap-2 pt-5">
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.08]"
          >
            View profile
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('contact')}
            aria-label={`Book ${t.name}`}
            className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.accent} text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.6)] transition hover:scale-105`}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        {/* Bottom accent sweep */}
        <div className={`absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r ${t.accent} transition-transform duration-500 group-hover:scale-x-100`} />
      </div>
    </article>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2 text-center">
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Modal                                                                     */
/* -------------------------------------------------------------------------- */

function TrainerModal({ t, onClose }: { t: Trainer; onClose: () => void }) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onEsc)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onEsc)
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trainer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
    >
      <div
        className="absolute inset-0 bg-[rgba(5,6,16,0.82)] backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c1f] shadow-[0_30px_80px_-20px_rgba(139,92,246,0.45)]">
        <div className="grid gap-0 sm:grid-cols-[0.9fr_1.1fr]">
          {/* Photo column */}
          <div className="relative aspect-square sm:aspect-auto">
            <img
              src={t.photo}
              alt={t.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(5,6,16,0.9)] via-transparent to-transparent sm:bg-gradient-to-r" />
            <div className="absolute left-5 top-5 flex flex-wrap gap-2">
              <AvailabilityDot available={t.availableNow} />
              <RatingPill value={t.rating} count={t.reviewCount} />
            </div>
          </div>

          {/* Details */}
          <div className="relative max-h-[min(80vh,720px)] overflow-y-auto p-6 sm:p-8">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              {t.role}
            </p>
            <h3 id="trainer-modal-title" className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              {t.name}
            </h3>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <StatCell label="Experience" value={`${t.experience}y`} />
              <StatCell label="Clients" value={`${t.clients}+`} />
              <StatCell label="Sessions" value={`${(t.sessions / 1000).toFixed(1)}k`} />
            </div>

            <p className="mt-5 text-sm leading-relaxed text-slate-300">{t.bio}</p>

            {/* Specialties */}
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Specialties
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.specialties.map((s) => (
                  <span
                    key={s}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200`}
                  >
                    <span className={`size-1.5 rounded-full bg-gradient-to-r ${t.accent}`} />
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Highlights
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                {t.achievements.map((a) => (
                  <li key={a} className="flex items-start gap-2">
                    <span className={`mt-1.5 size-1.5 shrink-0 rounded-full bg-gradient-to-r ${t.accent}`} />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Credentials */}
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Credentials
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.certs.map((c) => (
                  <span
                    key={c}
                    className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-200 ring-1 ring-emerald-500/20"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-7 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  scrollToSection('contact')
                }}
                className="flex-1 rounded-full bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(139,92,246,0.55)] transition hover:scale-[1.01]"
              >
                Book with {t.name.split(' ')[0]}
              </button>
              <a
                href="https://wa.me/919999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366] transition hover:bg-[#25D366]/25"
                aria-label="WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                  <path d="M17.6 6.32A7.92 7.92 0 0012.06 4h-.01a7.94 7.94 0 00-6.88 11.88L4 20l4.26-1.12a7.94 7.94 0 003.8.97h.01c4.38 0 7.94-3.56 7.94-7.94a7.88 7.88 0 00-2.41-5.59z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

export function TrainersSection() {
  const [filter, setFilter] = useState<FilterTag>('All')
  const [selected, setSelected] = useState<Trainer | null>(null)

  const featured = useMemo(() => TRAINERS.find((t) => t.featured)!, [])
  const rest = useMemo(() => TRAINERS.filter((t) => !t.featured), [])
  const filteredRest = useMemo(
    () => (filter === 'All' ? rest : rest.filter((t) => t.tags.includes(filter))),
    [filter, rest]
  )

  const gridRef = useRevealOnScroll<HTMLDivElement>({
    variant: 'up',
    selector: '[data-trainer]',
    stagger: 0.08,
  })

  const totalExp = useMemo(() => TRAINERS.reduce((n, t) => n + t.experience, 0), [])
  const avgRating = useMemo(
    () => (TRAINERS.reduce((n, t) => n + t.rating, 0) / TRAINERS.length).toFixed(1),
    []
  )

  return (
    <section id="trainers" className="relative py-28 sm:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Coaches"
          title="Meet the team that"
          highlight="makes it happen"
          subtitle="Credentialed, coached athletes themselves, and obsessed with the details that compound into results."
        />

        {/* KPI strip */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-3 sm:gap-6">
          <KpiCard v={`${TRAINERS.length}`} l="Full-time coaches" />
          <KpiCard v={`${avgRating}★`} l="Avg member rating" />
          <KpiCard v={`${totalExp}+`} l="Years combined" />
        </div>

        {/* Specialty filter */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {FILTER_TAGS.map((tag) => {
            const active = filter === tag
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setFilter(tag)}
                className={`relative rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-transparent text-white'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white'
                }`}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)] shadow-[0_8px_24px_-8px_rgba(139,92,246,0.7)]" />
                )}
                <span className="relative">{tag}</span>
              </button>
            )
          })}
        </div>

        {/* Bento grid */}
        <div
          ref={gridRef}
          className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:auto-rows-fr"
        >
          {(filter === 'All' || featured.tags.includes(filter)) && (
            <FeaturedTrainer t={featured} onOpen={() => setSelected(featured)} />
          )}
          {filteredRest.map((t) => (
            <TrainerCard key={t.id} t={t} onOpen={() => setSelected(t)} />
          ))}
        </div>

        {filteredRest.length === 0 && (filter !== 'All' && !featured.tags.includes(filter)) && (
          <div className="mt-10 rounded-2xl border border-white/5 bg-white/[0.03] p-10 text-center text-sm text-slate-400">
            No coaches match this specialty yet — but we're hiring. Check back soon.
          </div>
        )}

        {/* CTA footer card */}
        <div className="mt-14 overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.08),rgba(168,85,247,0.08))] p-6 backdrop-blur sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {TRAINERS.slice(0, 4).map((t) => (
                  <img
                    key={t.id}
                    src={t.photo}
                    alt=""
                    className="size-11 rounded-full border-2 border-[#05060e] object-cover"
                  />
                ))}
                <span className="flex size-11 items-center justify-center rounded-full border-2 border-[#05060e] bg-white/10 text-[11px] font-bold text-white">
                  +{TRAINERS.length - 4}
                </span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white sm:text-xl">
                  Not sure who to book with?
                </h4>
                <p className="mt-1 max-w-md text-sm text-slate-400">
                  Tell us your goal — we'll match you with the right coach on your
                  free trial session.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => scrollToSection('contact')}
              className="group relative overflow-hidden rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-8px_rgba(139,92,246,0.6)] transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="absolute inset-0 bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)]" />
              <span className="relative flex items-center gap-2">
                Match me with a coach
                <svg viewBox="0 0 24 24" className="size-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>

      {selected && <TrainerModal t={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}

function KpiCard({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 text-center backdrop-blur sm:px-4 sm:py-4">
      <p className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
        {v}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">
        {l}
      </p>
    </div>
  )
}
