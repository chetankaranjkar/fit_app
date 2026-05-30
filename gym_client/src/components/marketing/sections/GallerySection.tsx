import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRevealOnScroll } from '../../../lib/animations/useRevealOnScroll'
import { SectionHeader } from '../SectionHeader'
import { BeforeAfterSlider } from '../BeforeAfterSlider'

const TRANSFORMS = [
  {
    before: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80&auto=format&fit=crop',
    after: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80&auto=format&fit=crop',
    name: 'Rohan · 32',
    duration: '24 weeks · Hunter plan',
    result: '-14 kg',
    trainer: 'Arya Menon',
  },
  {
    before: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=900&q=80&auto=format&fit=crop',
    after: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=900&q=80&auto=format&fit=crop',
    name: 'Priya · 28',
    duration: '16 weeks · Hypertrophy',
    result: '+5 kg lean',
    trainer: 'Nia Fernandes',
  },
]

const STATS = [
  { value: 5000, suffix: '+', label: 'Members trained' },
  { value: 12000, suffix: '+', label: 'PRs broken' },
  { value: 98, suffix: '%', label: 'Retention rate' },
  { value: 4.9, suffix: '★', label: 'Average rating', decimals: 1 },
]

interface CounterProps {
  value: number
  suffix?: string
  decimals?: number
}

function Counter({ value, suffix = '', decimals = 0 }: CounterProps) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setDisplay(value)
      return
    }

    let started = false
    let raf = 0
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            started = true
            const start = performance.now()
            const duration = 1600
            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / duration)
              const eased = 1 - Math.pow(1 - p, 3)
              setDisplay(value * eased)
              if (p < 1) raf = requestAnimationFrame(tick)
            }
            raf = requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value])

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString('en-IN')

  return (
    <span ref={ref} className="font-display tabular-nums">
      {formatted}
      {suffix}
    </span>
  )
}

const GALLERY_FILTERS = ['All', 'Gym', 'Strength', 'Cardio', 'PT Sessions'] as const
type GalleryFilter = (typeof GALLERY_FILTERS)[number]

interface GalleryItem {
  src: string
  category: Exclude<GalleryFilter, 'All'>
  ratio: string
}

const GALLERY: GalleryItem[] = [
  { src: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=700&q=80&auto=format&fit=crop', category: 'Gym', ratio: '3/4' },
  { src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=700&q=80&auto=format&fit=crop', category: 'Strength', ratio: '1/1' },
  { src: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=700&q=80&auto=format&fit=crop', category: 'PT Sessions', ratio: '4/5' },
  { src: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=700&q=80&auto=format&fit=crop', category: 'Cardio', ratio: '3/4' },
  { src: 'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=700&q=80&auto=format&fit=crop', category: 'Strength', ratio: '1/1' },
  { src: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=700&q=80&auto=format&fit=crop', category: 'Cardio', ratio: '4/5' },
  { src: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=700&q=80&auto=format&fit=crop', category: 'PT Sessions', ratio: '3/4' },
  { src: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=700&q=80&auto=format&fit=crop', category: 'Strength', ratio: '4/5' },
  { src: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=700&q=80&auto=format&fit=crop', category: 'Gym', ratio: '1/1' },
  { src: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=700&q=80&auto=format&fit=crop', category: 'Gym', ratio: '4/5' },
  { src: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=700&q=80&auto=format&fit=crop', category: 'Cardio', ratio: '3/4' },
  { src: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=700&q=80&auto=format&fit=crop', category: 'PT Sessions', ratio: '1/1' },
]

export function GallerySection() {
  const rowRef = useRevealOnScroll<HTMLDivElement>({
    variant: 'up',
    selector: '[data-transform]',
    stagger: 0.12,
  })

  const [filter, setFilter] = useState<GalleryFilter>('All')
  const visible = useMemo(
    () => (filter === 'All' ? GALLERY : GALLERY.filter((g) => g.category === filter)),
    [filter]
  )

  return (
    <section id="gallery" className="relative py-28 sm:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,196,0,0.4)] to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Transformations"
          title="Real member"
          highlight="transformations"
          subtitle="Every photo is from a real Tiger Fitness member with written consent. Drag the slider — results vary, the consistency does not."
        />

        {/* Stats strip */}
        <div className="mt-14 grid grid-cols-2 gap-3 rounded-3xl border border-[rgba(245,196,0,0.2)] bg-[#0a0a0a]/60 p-5 backdrop-blur sm:grid-cols-4 sm:gap-6 sm:p-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="gradient-tiger-text text-3xl font-bold sm:text-4xl">
                <Counter value={s.value} suffix={s.suffix} decimals={s.decimals} />
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#888]">{s.label}</p>
            </div>
          ))}
        </div>

        <div ref={rowRef} className="mt-14 grid gap-6 md:grid-cols-2">
          {TRANSFORMS.map((t, i) => (
            <div key={i} data-transform>
              <BeforeAfterSlider {...t} />
            </div>
          ))}
        </div>

        {/* Filterable gallery */}
        <div className="mt-20 text-center">
          <span className="font-display inline-flex items-center gap-2 rounded-full border border-[rgba(245,196,0,0.3)] bg-[rgba(245,196,0,0.06)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F5C400] backdrop-blur">
            <span className="size-1.5 rounded-full bg-[#F5C400] shadow-[0_0_10px_rgba(245,196,0,0.8)]" />
            Inside the Studio
          </span>
          <h3 className="font-display mt-5 text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
            Explore the <span className="gradient-tiger-text">floor</span>
          </h3>
        </div>

        {/* Filter tabs */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {GALLERY_FILTERS.map((tag) => {
            const active = filter === tag
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setFilter(tag)}
                aria-pressed={active}
                className={`relative rounded-full border px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.08em] transition ${
                  active
                    ? 'border-transparent text-black'
                    : 'border-[rgba(245,196,0,0.2)] bg-white/[0.03] text-white/80 hover:border-[#F5C400] hover:text-white'
                }`}
              >
                {active && <span className="absolute inset-0 rounded-full gradient-tiger tiger-glow-soft" />}
                <span className="relative">{tag}</span>
              </button>
            )
          })}
        </div>

        {/* Masonry */}
        <div className="mt-8 columns-2 gap-3 md:columns-3 lg:columns-4">
          <AnimatePresence mode="popLayout">
            {visible.map((item) => (
              <motion.div
                key={item.src}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="group mb-3 overflow-hidden rounded-2xl border border-[rgba(245,196,0,0.12)] transition-colors hover:border-[rgba(245,196,0,0.4)]"
                style={{ breakInside: 'avoid' }}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={item.src}
                    alt={`${item.category} at Tiger Fitness`}
                    loading="lazy"
                    className="h-auto w-full object-cover transition duration-700 group-hover:scale-[1.06]"
                    style={{ aspectRatio: item.ratio }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <span className="font-display pointer-events-none absolute bottom-3 left-3 translate-y-2 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5C400] opacity-0 backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    {item.category}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
