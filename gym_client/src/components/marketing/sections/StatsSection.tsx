import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Users, Activity, ShieldCheck, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Stat {
  value: number
  suffix: string
  label: string
  decimals?: number
  Icon: LucideIcon
}

const STATS: Stat[] = [
  { value: 500, suffix: '+', label: 'Members', Icon: Users },
  { value: 15000, suffix: '+', label: 'Workouts Logged', Icon: Activity },
  { value: 12, suffix: '+', label: 'Expert Trainers', Icon: ShieldCheck },
  { value: 4.9, suffix: '★', label: 'Rating', decimals: 1, Icon: Star },
]

function Counter({
  value,
  suffix,
  decimals = 0,
  start,
}: {
  value: number
  suffix: string
  decimals?: number
  start: boolean
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!start) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setDisplay(value)
      return
    }
    let raf = 0
    const startTs = performance.now()
    const duration = 1800
    const tick = (t: number) => {
      const p = Math.min(1, (t - startTs) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, value])

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString('en-IN')

  return (
    <>
      {formatted}
      {suffix}
    </>
  )
}

export function StatsSection() {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  return (
    <section className="relative py-24 sm:py-28 lg:py-[120px]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,196,0,0.4)] to-transparent" />

      <div ref={ref} className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-3 rounded-3xl border border-[rgba(245,196,0,0.25)] bg-[#0a0a0a]/70 p-6 backdrop-blur-xl sm:grid-cols-2 sm:gap-5 sm:p-10 lg:grid-cols-4 lg:p-12 tiger-glow-soft">
          {STATS.map((s, i) => {
            const Icon = s.Icon
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl p-4 text-center transition lg:px-6 lg:py-2"
              >
                {/* Vertical divider */}
                {i < STATS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute right-0 top-1/2 hidden h-3/5 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-[rgba(245,196,0,0.3)] to-transparent lg:block"
                  />
                )}

                <span className="flex size-12 items-center justify-center rounded-xl border border-[rgba(245,196,0,0.3)] bg-[rgba(245,196,0,0.08)] text-[#F5C400] transition group-hover:bg-[rgba(245,196,0,0.18)]">
                  <Icon className="size-6" strokeWidth={1.7} />
                </span>

                <p className="font-display gradient-tiger-text text-4xl font-bold leading-none tabular-nums sm:text-5xl">
                  <Counter
                    value={s.value}
                    suffix={s.suffix}
                    decimals={s.decimals}
                    start={inView}
                  />
                </p>
                <p className="font-display text-[11px] uppercase tracking-[0.22em] text-[#B0B0B0]">
                  {s.label}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
