import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { SectionHeader } from '../SectionHeader'

interface Testimonial {
  quote: string
  author: string
  role: string
  avatar: string
  rating: number
  transformation: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "The programming is actually personalised — not a template. My lifts went up 30% in 6 months without a single tweaky elbow.",
    author: 'Ananya K.',
    role: 'Product Lead · Member since 2023',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&auto=format&fit=crop',
    rating: 5,
    transformation: 'Strength · +30%',
  },
  {
    quote:
      "First gym where the coaches know my name, my sleep score, and my current bench max. Recovery suite alone is worth it.",
    author: 'Vikram S.',
    role: 'Founder · 2 yr member',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop',
    rating: 5,
    transformation: 'Recomp',
  },
  {
    quote:
      "I trained my first HYROX here in 12 weeks. Coach Kabir's pacing plan put me on the podium. Still can't believe it.",
    author: 'Meera R.',
    role: 'Strategy consultant',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop',
    rating: 5,
    transformation: 'HYROX Podium',
  },
  {
    quote:
      "The nutrition coaching cut through a decade of internet noise. I eat more food, recover better, and finally built the glutes.",
    author: 'Ishita P.',
    role: 'Designer · member 18 mo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80&auto=format&fit=crop',
    rating: 5,
    transformation: 'Hypertrophy',
  },
  {
    quote:
      "After a slipped disc I thought lifting was over. The rehab-to-strength arc at Tiger Fitness pulled me back. Deadlifting again.",
    author: 'Siddharth J.',
    role: 'Surgeon',
    avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&q=80&auto=format&fit=crop',
    rating: 5,
    transformation: 'Rehab → Strength',
  },
  {
    quote:
      "Every rupee here buys data. InBody, DEXA, VO₂ — the feedback loop is why progress doesn't plateau. Apex tier is worth it.",
    author: 'Neel T.',
    role: 'Analyst · Apex tier',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80&auto=format&fit=crop',
    rating: 5,
    transformation: 'Fat Loss · -9%',
  },
]

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < value ? 'text-[#F5C400]' : 'text-[#333]'}
          style={i < value ? { textShadow: '0 0 8px rgba(245,196,0,0.5)' } : undefined}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export function TestimonialsSection() {
  const trackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const firstHalf = track.firstElementChild as HTMLElement | null
    if (!firstHalf) return

    let tween: gsap.core.Tween | null = null

    const setup = () => {
      tween?.kill()
      gsap.set(track, { x: 0 })
      const width = firstHalf.offsetWidth
      if (!width) return
      const duration = Math.max(25, Math.min(60, width / 40))
      tween = gsap.to(track, {
        x: -width,
        duration,
        ease: 'none',
        repeat: -1,
      })
    }

    setup()
    const ro = new ResizeObserver(() => setup())
    ro.observe(track)

    const parent = track.parentElement
    const pause = () => tween?.pause()
    const resume = () => tween?.resume()
    parent?.addEventListener('mouseenter', pause)
    parent?.addEventListener('mouseleave', resume)

    return () => {
      ro.disconnect()
      parent?.removeEventListener('mouseenter', pause)
      parent?.removeEventListener('mouseleave', resume)
      tween?.kill()
    }
  }, [])

  const doubled = [...TESTIMONIALS, ...TESTIMONIALS]

  return (
    <section id="testimonials" className="relative overflow-hidden py-28 sm:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,196,0,0.4)] to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Testimonials"
          title="500+ members. The"
          highlight="receipts don't lie."
          subtitle="A 4.9-star average across Google, Instagram, and Justdial. Here's what the Tiger Fitness community says."
        />
      </div>

      <div className="relative mt-16">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-black to-transparent sm:w-40" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-black to-transparent sm:w-40" />

        <div className="overflow-hidden">
          <div ref={trackRef} className="flex w-max">
            {[0, 1].map((row) => (
              <div key={row} className="flex gap-5 pr-5" aria-hidden={row === 1}>
                {doubled.slice(row * TESTIMONIALS.length, (row + 1) * TESTIMONIALS.length).map((t, i) => (
                  <article
                    key={`${row}-${i}`}
                    className="relative flex w-[340px] shrink-0 flex-col rounded-3xl border border-[rgba(245,196,0,0.15)] bg-[#0a0a0a]/70 p-7 backdrop-blur transition-colors hover:border-[rgba(245,196,0,0.4)] sm:w-[420px] sm:p-8"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Stars value={t.rating} />
                      <span className="font-display rounded-full border border-[rgba(245,196,0,0.3)] bg-[rgba(245,196,0,0.08)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#F5C400]">
                        {t.transformation}
                      </span>
                    </div>
                    <svg viewBox="0 0 24 24" className="absolute right-6 top-16 size-8 text-[#F5C400]/15" fill="currentColor">
                      <path d="M7.17 6A5.17 5.17 0 002 11.17V17h6v-6H5.17A2.17 2.17 0 017.17 9h.83V6zm11 0A5.17 5.17 0 0013 11.17V17h6v-6h-2.83a2.17 2.17 0 012-2h.83V6z" />
                    </svg>
                    <p className="mt-5 text-base leading-relaxed text-white/90">&ldquo;{t.quote}&rdquo;</p>
                    <div className="mt-7 flex items-center gap-3 border-t border-[rgba(245,196,0,0.12)] pt-5">
                      <img src={t.avatar} alt={t.author} className="size-11 rounded-full object-cover ring-1 ring-[rgba(245,196,0,0.3)]" />
                      <div>
                        <p className="text-sm font-semibold text-white">{t.author}</p>
                        <p className="text-xs text-[#888]">{t.role}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
