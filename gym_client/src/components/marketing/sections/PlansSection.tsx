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
  accent: string
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tag: 'New to lifting',
    description: 'Open-gym access and monthly coach check-ins to get started right.',
    monthly: 2499,
    yearly: 24990,
    accent: 'from-blue-500/20 to-blue-500/5',
    features: [
      'Open-gym access · 24/7',
      'Onboarding assessment',
      '1 group class / week',
      'Body composition scan / mo',
      'App-based workout log',
    ],
  },
  {
    id: 'performance',
    name: 'Performance',
    tag: 'Most popular',
    description: 'Our signature plan. Small-group coaching + programming tailored to your data.',
    monthly: 5999,
    yearly: 59990,
    highlight: true,
    accent: 'from-purple-500/25 to-blue-500/10',
    features: [
      'Everything in Starter',
      'Small-group coaching · 4x/wk',
      'Personalised programming',
      'Monthly strategy review',
      'InBody + recovery scans',
      'Nutrition guidance',
      'Full recovery-suite access',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tag: 'For athletes',
    description: '1-on-1 coaching, full-stack testing, and concierge nutrition.',
    monthly: 12999,
    yearly: 129990,
    accent: 'from-fuchsia-500/20 to-rose-500/5',
    features: [
      'Everything in Performance',
      'Private 1-on-1 coaching',
      'VO₂ max + DEXA quarterly',
      'Dedicated nutritionist',
      'Physio access · 2x/mo',
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
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Membership"
          title="Plans that match"
          highlight="your ambition"
          subtitle="Transparent pricing, no contracts, cancel anytime. Annual plans get two months free."
        />

        {/* Billing toggle */}
        <div className="mt-10 flex justify-center">
          <div
            role="tablist"
            aria-label="Billing cycle"
            className="relative inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur"
          >
            <span
              aria-hidden
              className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)] transition-all duration-300 ${
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
                className={`relative z-10 min-w-[128px] rounded-full px-5 py-2 text-sm font-semibold transition ${
                  cycle === c ? 'text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {c === 'monthly' ? 'Monthly' : 'Yearly'}
                {c === 'yearly' && (
                  <span className="ml-2 rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">
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
                className={`relative flex flex-col overflow-hidden rounded-3xl border p-7 transition-all duration-500 ${
                  plan.highlight
                    ? 'border-purple-400/30 bg-[rgba(12,14,34,0.9)] shadow-[0_30px_80px_-20px_rgba(139,92,246,0.4)]'
                    : 'border-white/5 bg-white/[0.02] hover:-translate-y-1 hover:border-white/15'
                }`}
              >
                {plan.highlight && (
                  <>
                    <div className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${plan.accent}`} />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
                  </>
                )}

                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {plan.tag}
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-white">{plan.name}</h3>
                  </div>
                  {plan.highlight && (
                    <span className="rounded-full bg-[linear-gradient(135deg,#3b82f6,#a855f7)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      Popular
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-400">{plan.description}</p>

                <div className="mt-7 flex items-end gap-2">
                  <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-5xl font-bold leading-none text-transparent">
                    {formatPrice(price)}
                  </span>
                  <span className="mb-1 text-sm font-medium text-slate-500">{perLabel}</span>
                </div>
                {cycle === 'yearly' && (
                  <p className="mt-1 text-xs text-emerald-300">
                    You save {formatPrice(plan.monthly * 12 - plan.yearly)} /year
                  </p>
                )}

                <ul className="mt-7 space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-slate-300">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="size-3">
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
                  className={`mt-8 w-full rounded-full px-5 py-3 text-sm font-semibold transition active:scale-[0.98] ${
                    plan.highlight
                      ? 'bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)] text-white shadow-[0_12px_30px_-8px_rgba(139,92,246,0.6)] hover:scale-[1.02]'
                      : 'border border-white/15 bg-white/[0.03] text-white hover:border-white/30 hover:bg-white/[0.08]'
                  }`}
                >
                  {plan.highlight ? 'Start free trial' : 'Choose plan'}
                </button>
              </article>
            )
          })}
        </div>

        <p className="mt-10 text-center text-xs text-slate-500">
          All plans include a 7-day satisfaction guarantee. GST applicable where relevant.
        </p>
      </div>
    </section>
  )
}
