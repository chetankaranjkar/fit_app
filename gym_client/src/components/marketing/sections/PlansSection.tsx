import { useState } from 'react'
import { useRevealOnScroll } from '../../../lib/animations/useRevealOnScroll'
import { SectionHeader } from '../SectionHeader'
import { scrollToSection } from '../../../lib/animations/useSmoothScroll'

type Cycle = 'monthly' | 'yearly'

interface Plan {
  id: string
  name: string
  tag: string
  description: string
  monthly: number
  yearly: number
  features: string[]
  highlight?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Prowl',
    tag: 'Get started',
    description: 'Open-gym access and onboarding to begin your Tiger Fitness journey.',
    monthly: 2499,
    yearly: 24990,
    features: [
      '24/7 studio access',
      'Onboarding assessment',
      '1 group class / week',
      'Body composition scan / month',
      'Tiger Fitness app',
    ],
  },
  {
    id: 'performance',
    name: 'Hunter',
    tag: 'Most popular',
    description: 'Our signature plan. Small-group coaching plus programming tailored to your data.',
    monthly: 5999,
    yearly: 59990,
    highlight: true,
    features: [
      'Everything in Prowl',
      'Small-group coaching · 4×/wk',
      'Personalised programming',
      'Monthly strategy review',
      'InBody + recovery scans',
      'Nutrition guidance',
      'Full recovery suite',
    ],
  },
  {
    id: 'elite',
    name: 'Apex',
    tag: 'For athletes',
    description: '1-on-1 coaching, full-stack testing, and concierge nutrition. The full pride.',
    monthly: 12999,
    yearly: 129990,
    features: [
      'Everything in Hunter',
      'Private 1-on-1 coaching',
      'VO₂ max + DEXA quarterly',
      'Dedicated nutritionist',
      'Physio · 2×/month',
      'Custom supplement protocol',
      'Priority class booking',
    ],
  },
]

function formatPrice(v: number) {
  return `₹${v.toLocaleString('en-IN')}`
}

export function PlansSection() {
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const gridRef = useRevealOnScroll<HTMLDivElement>({
    variant: 'up',
    selector: '[data-plan]',
    stagger: 0.1,
  })

  return (
    <section id="plans" className="relative py-28 sm:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,196,0,0.4)] to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Membership"
          title="Plans that match"
          highlight="your ambition"
          subtitle="Transparent pricing. No contracts. Cancel anytime. Annual plans get two months free."
        />

        {/* Billing toggle */}
        <div className="mt-12 flex justify-center">
          <div
            role="tablist"
            aria-label="Billing cycle"
            className="relative inline-flex rounded-full border border-[rgba(245,196,0,0.25)] bg-black/50 p-1 backdrop-blur"
          >
            <span
              aria-hidden
              className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-full gradient-tiger tiger-glow-soft transition-all duration-300 ${
                cycle === 'monthly' ? 'left-1' : 'left-[calc(50%+3px)]'
              }`}
            />
            {(['monthly', 'yearly'] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={cycle === c}
                onClick={() => setCycle(c)}
                className={`relative z-10 min-w-[140px] rounded-full px-5 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] transition ${
                  cycle === c ? 'text-black' : 'text-white/75 hover:text-white'
                }`}
              >
                {c === 'monthly' ? 'Monthly' : 'Yearly'}
                {c === 'yearly' && (
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      cycle === 'yearly' ? 'bg-black/15 text-black' : 'bg-emerald-400/15 text-emerald-200'
                    }`}
                  >
                    -17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div ref={gridRef} className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = cycle === 'monthly' ? plan.monthly : plan.yearly
            const perLabel = cycle === 'monthly' ? '/month' : '/year'
            return (
              <article
                key={plan.id}
                data-plan
                className={`group relative flex flex-col overflow-hidden rounded-3xl border p-8 transition-all duration-500 ${
                  plan.highlight
                    ? 'border-[rgba(245,196,0,0.55)] bg-[#0a0a0a] shadow-[0_30px_80px_-20px_rgba(245,196,0,0.55)] lg:scale-[1.05]'
                    : 'border-[rgba(245,196,0,0.15)] bg-[#0a0a0a]/70 backdrop-blur hover:-translate-y-1 hover:border-[rgba(245,196,0,0.45)]'
                }`}
              >
                {plan.highlight && (
                  <>
                    <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(245,196,0,0.18),transparent_60%)]" />
                    <div className="absolute inset-x-0 top-0 h-px gradient-tiger" />
                    <span className="font-sans absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full gradient-tiger px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-black tiger-glow-soft">
                      <svg viewBox="0 0 24 24" className="size-3" fill="currentColor" aria-hidden>
                        <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.6L6 22l1.5-7.2L2 10l7.1-1.1L12 2z" />
                      </svg>
                      Most Popular
                    </span>
                  </>
                )}

                <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-[#F5C400]">
                  {plan.tag}
                </p>
                <h3 className="font-display mt-2 text-4xl font-bold uppercase tracking-tight text-white">
                  {plan.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#B0B0B0]">{plan.description}</p>

                <div className="mt-7 flex items-end gap-2">
                  <span className="font-display text-5xl font-bold leading-none text-white">
                    {formatPrice(price)}
                  </span>
                  <span className="mb-1 text-sm font-medium text-[#888]">{perLabel}</span>
                </div>
                {cycle === 'yearly' && (
                  <p className="mt-1 text-xs text-emerald-300">
                    You save {formatPrice(plan.monthly * 12 - plan.yearly)} /year
                  </p>
                )}

                <div className="my-7 h-px bg-gradient-to-r from-transparent via-[rgba(245,196,0,0.25)] to-transparent" />

                <ul className="space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-white/85">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[rgba(245,196,0,0.15)] text-[#F5C400] ring-1 ring-[rgba(245,196,0,0.3)]">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} className="size-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => scrollToSection('contact')}
                  className={`mt-9 w-full rounded-full px-5 py-3.5 font-sans text-sm font-bold uppercase tracking-[0.06em] transition active:scale-[0.98] ${
                    plan.highlight
                      ? 'gradient-tiger text-black tiger-glow hover:scale-[1.02]'
                      : 'border border-[rgba(245,196,0,0.35)] bg-white/[0.03] text-white hover:border-[#F5C400] hover:bg-[rgba(245,196,0,0.08)]'
                  }`}
                >
                  {plan.highlight ? 'Start Free Trial' : 'Choose Plan'}
                </button>
              </article>
            )
          })}
        </div>

        <p className="mt-12 text-center text-xs uppercase tracking-[0.18em] text-[#666]">
          7-day satisfaction guarantee · GST applicable where relevant
        </p>
      </div>
    </section>
  )
}
