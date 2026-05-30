import { useCallback, useRef } from 'react'
import { useRevealOnScroll } from '../../../lib/animations/useRevealOnScroll'
import { SectionHeader } from '../SectionHeader'
import {
  Activity,
  Apple,
  BarChart3,
  Dumbbell,
  Ruler,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Feature {
  id: string
  title: string
  description: string
  Icon: LucideIcon
  metric: string
}

const FEATURES: Feature[] = [
  {
    id: 'pt',
    title: 'Personal Training',
    description:
      'One-on-one coaching with elite trainers. Periodised programs tailored to your goals, recovery, and lifestyle.',
    Icon: Dumbbell,
    metric: '1-on-1',
  },
  {
    id: 'tracking',
    title: 'Workout Tracking',
    description:
      'Log every set, rep, and PR in the Tiger Fitness app. Real-time form feedback from your coach in-session.',
    Icon: Activity,
    metric: 'Real-time',
  },
  {
    id: 'analytics',
    title: 'Progress Analytics',
    description:
      'Strength curves, volume trends, and recovery scores rendered on a dashboard your coach reads weekly.',
    Icon: BarChart3,
    metric: '12 metrics',
  },
  {
    id: 'nutrition',
    title: 'Nutrition Guidance',
    description:
      'Macros, meal plans, and supplement protocols built for your training phase — not a one-size-fits-all template.',
    Icon: Apple,
    metric: 'Custom',
  },
  {
    id: 'measurements',
    title: 'Body Measurements',
    description:
      'Monthly InBody, DEXA, and full-body 3D scans. See lean mass, body fat, and posture shifts in millimetres.',
    Icon: Ruler,
    metric: 'Monthly',
  },
  {
    id: 'community',
    title: 'Community Support',
    description:
      'Members-only events, challenges, and a private community of athletes who train hard and lift each other up.',
    Icon: UsersRound,
    metric: '5K+',
  },
]

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

function FeatureCard({ f }: { f: Feature }) {
  const { ref, onMove } = useSpotlight()
  const Icon = f.Icon
  return (
    <article
      ref={ref}
      onMouseMove={onMove}
      data-feature
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-[rgba(245,196,0,0.12)] bg-[#0a0a0a]/80 p-7 backdrop-blur transition-all duration-500 hover:-translate-y-1 hover:border-[rgba(245,196,0,0.45)]"
    >
      {/* Mouse spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(360px circle at var(--mx,50%) var(--my,50%), rgba(245,196,0,0.10), transparent 55%)',
        }}
      />

      {/* Icon tile */}
      <div className="relative flex items-start justify-between">
        <span className="relative flex size-14 items-center justify-center rounded-2xl border border-[rgba(245,196,0,0.3)] bg-[rgba(245,196,0,0.08)] text-[#F5C400] transition group-hover:border-[#F5C400] group-hover:bg-[rgba(245,196,0,0.18)]">
          <Icon className="size-7" strokeWidth={1.7} />
        </span>
        <span className="font-display rounded-full border border-[rgba(245,196,0,0.25)] bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F5C400]">
          {f.metric}
        </span>
      </div>

      <h3 className="font-display mt-7 text-2xl font-bold uppercase tracking-wide text-white">
        {f.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-[#B0B0B0]">{f.description}</p>

      {/* Bottom accent sweep */}
      <div className="absolute inset-x-7 bottom-0 h-px origin-left scale-x-0 gradient-tiger transition-transform duration-500 group-hover:scale-x-100" />
    </article>
  )
}

export function FeaturesSection() {
  const gridRef = useRevealOnScroll<HTMLDivElement>({
    variant: 'up',
    selector: '[data-feature]',
    stagger: 0.08,
  })

  return (
    <section id="features" className="relative py-28 sm:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,196,0,0.4)] to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Features"
          title="Everything you need to"
          highlight="train like a tiger"
          subtitle="Tiger Fitness combines elite coaching, smart tracking, and a recovery stack that compounds your progress — month over month."
        />

        <div ref={gridRef} className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.id} f={f} />
          ))}
        </div>
      </div>
    </section>
  )
}
