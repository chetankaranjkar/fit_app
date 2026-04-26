import { useState } from 'react'
import { useRevealOnScroll } from '../../../lib/animations/useRevealOnScroll'
import { SectionHeader } from '../SectionHeader'

interface FormState {
  name: string
  email: string
  phone: string
  goal: string
  message: string
}

const INITIAL: FormState = { name: '', email: '', phone: '', goal: '', message: '' }

const GOALS = ['Build muscle', 'Lose fat', 'Get stronger', 'Sport performance', 'Rehab', 'Just explore']

export function ContactSection() {
  const leftRef = useRevealOnScroll<HTMLDivElement>({ variant: 'slide-left' })
  const rightRef = useRevealOnScroll<HTMLDivElement>({ variant: 'slide-right', delay: 0.1 })

  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) errs.name = 'Tell us your name'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Valid email required'
    if (form.phone && !/^\+?[\d\s-]{8,}$/.test(form.phone)) errs.phone = 'Check that number'
    if (!form.goal) errs.goal = 'Pick a goal'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    // Static marketing — in production, POST to /api/leads
    setSubmitted(true)
    setForm(INITIAL)
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  return (
    <section id="contact" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Start"
          title="Book your"
          highlight="free trial session"
          subtitle="A no-pressure 60-minute movement assessment + a tour. You'll leave with a custom starter plan whether you join or not."
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Left info panel */}
          <div
            ref={leftRef}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.1),rgba(168,85,247,0.08))] p-8 backdrop-blur sm:p-10"
          >
            <div className="absolute -right-10 -top-10 size-48 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.3),transparent_60%)] blur-2xl" />

            <h3 className="text-2xl font-bold text-white sm:text-3xl">
              A few ways to say hi.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
              Pick whatever's easiest. We reply within a few hours during studio hours.
            </p>

            <div className="mt-8 space-y-4">
              <a
                href="https://wa.me/919999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#25D366]/50 hover:bg-[#25D366]/5"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366]">
                  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                    <path d="M17.6 6.32A7.92 7.92 0 0012.06 4h-.01a7.94 7.94 0 00-6.88 11.88L4 20l4.26-1.12a7.94 7.94 0 003.8.97h.01c4.38 0 7.94-3.56 7.94-7.94a7.88 7.88 0 00-2.41-5.59zM12 18.5a6.6 6.6 0 01-3.36-.92l-.24-.14-2.53.66.68-2.46-.16-.25a6.6 6.6 0 1112.26-3.46 6.6 6.6 0 01-6.65 6.57z" />
                  </svg>
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">WhatsApp</p>
                  <p className="text-xs text-slate-400">Fastest reply · +91 99999 99999</p>
                </div>
                <svg viewBox="0 0 24 24" className="size-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>

              <a
                href="mailto:hello@ironpulse.fit"
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-blue-400/50 hover:bg-blue-400/5"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-blue-400/15 text-blue-300">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7zM4 7l8 6 8-6" />
                  </svg>
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Email</p>
                  <p className="text-xs text-slate-400">hello@ironpulse.fit</p>
                </div>
                <svg viewBox="0 0 24 24" className="size-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>

              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-purple-400/15 text-purple-300">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a3 3 0 100-6 3 3 0 000 6zM12 22s8-8 8-14a8 8 0 10-16 0c0 6 8 14 8 14z" />
                  </svg>
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Studio</p>
                  <p className="text-xs text-slate-400">5th Flr · Ceejay House · Worli, Mumbai</p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Studio hours
              </p>
              <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm text-slate-300">
                <span>Mon – Fri</span>
                <span className="text-right text-white">5:00 am – 11:00 pm</span>
                <span>Sat – Sun</span>
                <span className="text-right text-white">6:00 am – 9:00 pm</span>
              </div>
            </div>
          </div>

          {/* Right form */}
          <div
            ref={rightRef}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-[rgba(10,12,30,0.9)] p-8 backdrop-blur sm:p-10"
          >
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                  <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-5 text-2xl font-bold text-white">You're on the list.</h3>
                <p className="mt-2 max-w-sm text-sm text-slate-400">
                  A coach will reach out within 24 hours to book your free trial. In the meantime, check your email.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-6 rounded-full border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                >
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <h3 className="text-2xl font-bold text-white">Tell us about you</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" error={errors.name}>
                    <input
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="Jane Lifter"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20"
                    />
                  </Field>
                  <Field label="Email" error={errors.email}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20"
                    />
                  </Field>
                </div>

                <Field label="Phone (optional)" error={errors.phone}>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20"
                  />
                </Field>

                <Field label="Primary goal" error={errors.goal}>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => set('goal', g)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                          form.goal === g
                            ? 'border-purple-400/50 bg-purple-400/15 text-white'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Anything else? (optional)">
                  <textarea
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                    rows={3}
                    placeholder="Injuries, schedule constraints, or specific questions…"
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20"
                  />
                </Field>

                <button
                  type="submit"
                  className="group relative w-full overflow-hidden rounded-full px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_40px_-12px_rgba(139,92,246,0.65)] transition hover:scale-[1.01] active:scale-[0.98]"
                >
                  <span className="absolute inset-0 bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)]" />
                  <span className="relative flex items-center justify-center gap-2">
                    Book my free trial
                    <svg viewBox="0 0 24 24" className="size-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </button>
                <p className="text-center text-[11px] text-slate-500">
                  By submitting you agree to our lightweight privacy policy. No spam, ever.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  )
}
