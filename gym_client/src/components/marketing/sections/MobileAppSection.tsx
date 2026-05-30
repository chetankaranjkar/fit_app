import { useRevealOnScroll } from '../../../lib/animations/useRevealOnScroll'
import { SectionHeader } from '../SectionHeader'
import { Activity, Calendar, LineChart, MessageCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Feature {
  Icon: LucideIcon
  title: string
  description: string
}

const APP_FEATURES: Feature[] = [
  {
    Icon: Activity,
    title: 'Workout Tracking',
    description: 'Log every set, rep, and PR. Auto-detected exercise prompts, video form check, RPE.',
  },
  {
    Icon: Calendar,
    title: 'Attendance',
    description: 'Tap-to-check-in QR at the front desk. Streak tracking and weekly attendance score.',
  },
  {
    Icon: LineChart,
    title: 'Progress Monitoring',
    description: 'Strength curves, body composition trends, recovery scores — all in one dashboard.',
  },
  {
    Icon: MessageCircle,
    title: 'Trainer Feedback',
    description: 'Direct messaging with your coach. Form videos reviewed within 24 hours.',
  },
]

function PhoneFrame({
  className = '',
  rotate = 0,
  imageSrc,
}: {
  className?: string
  rotate?: number
  imageSrc: string
}) {
  return (
    <div
      className={`relative ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="relative w-full overflow-hidden rounded-[2.4rem] border border-[rgba(245,196,0,0.3)] bg-black shadow-[0_30px_80px_-20px_rgba(245,196,0,0.4)]">
        {/* Notch */}
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10" />
        <div className="relative aspect-[9/19] w-full">
          <img
            src={imageSrc}
            alt="Tiger Fitness mobile app"
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
        </div>
      </div>
      {/* Side reflection */}
      <div className="pointer-events-none absolute inset-y-3 -right-1 w-1 rounded-r-full bg-gradient-to-b from-[#F5C400]/60 via-transparent to-[#F5C400]/30" />
    </div>
  )
}

export function MobileAppSection() {
  const containerRef = useRevealOnScroll<HTMLDivElement>({
    variant: 'up',
    selector: '[data-app-feature]',
    stagger: 0.08,
  })

  return (
    <section id="app" className="relative py-28 sm:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,196,0,0.4)] to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Mobile App"
          title="Train smarter with the"
          highlight="Tiger Fitness app."
          subtitle="Your gym, your coach, your progress — in your pocket. iOS and Android."
        />

        <div
          ref={containerRef}
          className="mt-16 grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16"
        >
          {/* Phones */}
          <div className="relative mx-auto flex h-[34rem] w-full max-w-md items-center justify-center sm:h-[38rem]">
            {/* Glow ring */}
            <div className="absolute inset-10 rounded-[3rem] gradient-tiger opacity-30 blur-3xl" />

            <PhoneFrame
              className="absolute left-0 top-8 w-[55%]"
              rotate={-8}
              imageSrc="https://images.unsplash.com/photo-1518644961665-ed172691aaa1?w=600&q=80&auto=format&fit=crop"
            />
            <PhoneFrame
              className="relative z-10 w-[60%]"
              imageSrc="https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=600&q=80&auto=format&fit=crop"
            />
            <PhoneFrame
              className="absolute right-0 top-8 w-[55%]"
              rotate={8}
              imageSrc="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80&auto=format&fit=crop"
            />
          </div>

          {/* Features list */}
          <div>
            <div className="space-y-5">
              {APP_FEATURES.map((f) => {
                const Icon = f.Icon
                return (
                  <article
                    key={f.title}
                    data-app-feature
                    className="group flex items-start gap-4 rounded-2xl border border-[rgba(245,196,0,0.15)] bg-[#0a0a0a]/60 p-5 backdrop-blur transition hover:border-[rgba(245,196,0,0.4)]"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(245,196,0,0.3)] bg-[rgba(245,196,0,0.08)] text-[#F5C400] transition group-hover:bg-[rgba(245,196,0,0.18)]">
                      <Icon className="size-6" strokeWidth={1.7} />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold uppercase tracking-wide text-white">
                        {f.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#B0B0B0]">
                        {f.description}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Store badges */}
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#"
                aria-label="Download on the App Store"
                className="flex items-center gap-3 rounded-xl border border-[rgba(245,196,0,0.25)] bg-black/70 px-5 py-3 text-white transition hover:border-[#F5C400] hover:bg-[rgba(245,196,0,0.08)]"
              >
                <svg viewBox="0 0 24 24" className="size-7 text-white" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#888]">Download on the</span>
                  <span className="font-display text-base font-bold uppercase tracking-wide">App Store</span>
                </div>
              </a>
              <a
                href="#"
                aria-label="Get it on Google Play"
                className="flex items-center gap-3 rounded-xl border border-[rgba(245,196,0,0.25)] bg-black/70 px-5 py-3 text-white transition hover:border-[#F5C400] hover:bg-[rgba(245,196,0,0.08)]"
              >
                <svg viewBox="0 0 24 24" className="size-7" fill="none">
                  <path d="M3.6 1.7c-.4.3-.6.7-.6 1.4v17.8c0 .7.2 1.1.6 1.4l9.2-9.2L3.6 1.7Z" fill="#F5C400" />
                  <path d="m12.8 12.1 3.1-3.1L4.7 1.4c-.3-.1-.6-.1-.8 0l8.9 10.7Z" fill="#FFD942" />
                  <path d="m12.8 12.1-8.9 10.7c.2.1.5.1.8 0L15.9 16l-3.1-3.9Z" fill="#D9A400" />
                  <path d="m12.8 12.1 3.1 3.9 4.5-2.6c.6-.4.6-1.1 0-1.5l-4.5-2.9-3.1 3.1Z" fill="#B58800" />
                </svg>
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#888]">Get it on</span>
                  <span className="font-display text-base font-bold uppercase tracking-wide">Google Play</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
