import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * Premium full-screen loader used as the Suspense fallback for route-level
 * code splitting. Designed with the "PulseFit" brand language:
 *
 *   * Dark ambient background + soft radial gradient washes
 *   * Subtle grid backdrop for depth
 *   * Orbiting gradient ring around the brand mark
 *   * Gently pulsing logo tile
 *   * Indeterminate shimmer bar
 *   * Gradient wordmark + rotating status caption
 *
 * UX detail: the whole container starts at `opacity: 0` and only fades in
 * after a 200ms delay. If the lazy chunk resolves quickly (most cases, thanks
 * to warmup + optimizeDeps), the loader never becomes visible \u2014 no flash.
 */
export function AppLoader({
  message = 'Preparing your workspace',
}: {
  message?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<SVGGElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, delay: 0.2, ease: 'power2.out' },
      )

      if (markRef.current) {
        gsap.to(markRef.current, {
          scale: 1.07,
          duration: 1.2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
      }

      if (ringRef.current) {
        gsap.to(ringRef.current, {
          rotate: 360,
          duration: 2.6,
          ease: 'none',
          repeat: -1,
          transformOrigin: 'center',
        })
      }

      if (barRef.current) {
        gsap.fromTo(
          barRef.current,
          { xPercent: -120 },
          {
            xPercent: 220,
            duration: 1.5,
            ease: 'power1.inOut',
            repeat: -1,
          },
        )
      }

      if (captionRef.current) {
        const captions = [
          message,
          'Optimising layout',
          'Almost there',
        ]
        const el = captionRef.current
        let i = 0
        const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power2.inOut' } })
        captions.forEach(() => {
          tl.to(el, { opacity: 0, duration: 0.35, delay: 1.4 })
            .call(() => {
              i = (i + 1) % captions.length
              el.textContent = captions[i]
            })
            .to(el, { opacity: 1, duration: 0.35 })
        })
      }
    }, root)

    return () => ctx.revert()
  }, [message])

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#070716] text-slate-200"
      style={{ opacity: 0 }}
    >
      {/* Ambient gradient washes */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-30%] h-[80vmin] w-[80vmin] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.28), transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 bottom-[-30%] h-[70vmin] w-[70vmin] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(168,85,247,0.22), transparent 60%)',
        }}
      />
      {/* Grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.05,
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse at center, black 40%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 40%, transparent 75%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-7">
        {/* Orbiting ring + brand mark */}
        <div className="relative flex size-28 items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 size-full"
            aria-hidden
          >
            <defs>
              <linearGradient id="al-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
            {/* Faint full circle */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="rgba(148,163,184,0.14)"
              strokeWidth="1.25"
            />
            {/* Rotating gradient arc */}
            <g ref={ringRef}>
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="url(#al-ring)"
                strokeWidth="2"
                strokeDasharray="60 260"
                strokeLinecap="round"
              />
            </g>
          </svg>
          <div
            ref={markRef}
            className="relative flex size-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-white shadow-[0_10px_40px_-10px_rgba(168,85,247,0.7)]"
          >
            <svg
              className="size-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M6 8h2v8H6m10-8h2v8h-2M8 12h8M4 10h2v4H4m14-4h2v4h-2"
              />
            </svg>
          </div>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col items-center gap-1.5">
          <p className="bg-[linear-gradient(135deg,#60a5fa,#c084fc)] bg-clip-text text-lg font-bold uppercase tracking-[0.32em] text-transparent">
            PulseFit
          </p>
          <p
            ref={captionRef}
            className="text-[11px] uppercase tracking-[0.2em] text-slate-500"
          >
            {message}
          </p>
        </div>

        {/* Indeterminate shimmer bar */}
        <div className="relative h-1 w-56 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-inset ring-white/5">
          <div
            ref={barRef}
            className="absolute inset-y-0 left-0 w-1/2 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(96,165,250,0.6) 40%, rgba(192,132,252,0.85) 60%, transparent 100%)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
