import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { TigerLogo } from '../marketing/TigerLogo'

const STATUS_LINES = [
  'Preparing your workspace',
  'Loading modules',
  'Almost there',
] as const

/**
 * Full-screen Suspense fallback — Tiger Fitness brand.
 * Fades in after 200ms so fast chunk loads never flash the overlay.
 */
export function AppLoader({
  message = STATUS_LINES[0],
}: {
  message?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<SVGGElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLParagraphElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const captions = [message, ...STATUS_LINES.filter((l) => l !== message)]

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, delay: 0.2, ease: 'power2.out' },
      )

      if (glowRef.current) {
        gsap.to(glowRef.current, {
          scale: 1.15,
          opacity: 0.55,
          duration: 2.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
      }

      if (markRef.current) {
        gsap.to(markRef.current, {
          scale: 1.05,
          duration: 1.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
      }

      if (ringRef.current) {
        gsap.to(ringRef.current, {
          rotate: 360,
          duration: 2.2,
          ease: 'none',
          repeat: -1,
          transformOrigin: '50% 50%',
        })
      }

      if (barRef.current) {
        gsap.fromTo(
          barRef.current,
          { xPercent: -110 },
          {
            xPercent: 210,
            duration: 1.25,
            ease: 'power2.inOut',
            repeat: -1,
          },
        )
      }

      if (captionRef.current) {
        const el = captionRef.current
        let i = 0
        const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power2.inOut' } })
        captions.forEach(() => {
          tl.to(el, { opacity: 0, duration: 0.3, delay: 1.2 })
            .call(() => {
              i = (i + 1) % captions.length
              el.textContent = captions[i]!
            })
            .to(el, { opacity: 1, duration: 0.3 })
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
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#050505] text-white"
      style={{ opacity: 0 }}
    >
      {/* Ambient gold washes */}
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 size-[70vmin] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(245,196,0,0.35), transparent 62%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-15%] right-[-10%] size-[55vmin] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(217,164,0,0.18), transparent 65%)',
        }}
      />

      {/* Tiger stripes + drifting watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40 tiger-stripes" />
      <img
        src="/tiger-fitness-logo.png"
        alt=""
        aria-hidden
        className="animate-tiger-watermark-drift pointer-events-none absolute left-1/2 top-1/2 w-[min(90vw,520px)] object-contain opacity-[0.07] blur-[1px]"
      />

      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_40px_rgba(0,0,0,0.75)]"
      />

      <div className="relative flex w-full max-w-sm flex-col items-center px-6">
        <div className="glass-card-strong border-gradient-tiger relative flex w-full flex-col items-center gap-6 rounded-3xl px-8 py-10 tiger-glow-soft">
          {/* Orbiting gold ring + logo */}
          <div className="relative flex size-32 items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 size-full"
              aria-hidden
            >
              <defs>
                <linearGradient id="app-loader-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffd942" />
                  <stop offset="50%" stopColor="#f5c400" />
                  <stop offset="100%" stopColor="#d9a400" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="rgba(245,196,0,0.12)"
                strokeWidth="1.5"
              />
              <g ref={ringRef}>
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="url(#app-loader-ring)"
                  strokeWidth="2.5"
                  strokeDasharray="72 240"
                  strokeLinecap="round"
                />
              </g>
            </svg>
            <div
              ref={markRef}
              className="relative flex size-[4.5rem] items-center justify-center rounded-2xl border border-[rgba(245,196,0,0.25)] bg-black/60 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <TigerLogo variant="mark" size={64} />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <p className="font-display text-3xl font-bold uppercase leading-none tracking-[0.12em] text-white">
              Tiger <span className="gradient-tiger-text">Fitness</span>
            </p>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.35em] text-[#F5C400]/80">
              Train Like A Tiger
            </p>
          </div>

          {/* Progress shimmer */}
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-inset ring-[rgba(245,196,0,0.15)]">
            <div
              ref={barRef}
              className="absolute inset-y-0 left-0 w-2/5 rounded-full gradient-tiger opacity-90"
            />
          </div>

          <p
            ref={captionRef}
            className="font-sans min-h-[1rem] text-center text-[11px] font-medium uppercase tracking-[0.22em] text-[#888]"
          >
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}
