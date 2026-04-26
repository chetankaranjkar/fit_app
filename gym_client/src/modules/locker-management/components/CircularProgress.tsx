import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * Animated circular progress ring. Scoped GSAP tween on the dash offset.
 * Colors pulled from tailwind palette (dark theme aware).
 */
export function CircularProgress({
  percent,
  size = 160,
  strokeWidth = 14,
  label,
  sublabel,
}: {
  percent: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
}) {
  const progressRef = useRef<SVGCircleElement>(null)
  const clamped = Math.max(0, Math.min(100, percent))
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r

  useEffect(() => {
    const el = progressRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { strokeDashoffset: c },
        {
          strokeDashoffset: c * (1 - clamped / 100),
          duration: 0.9,
          ease: 'power3.out',
        },
      )
    }, el)
    return () => ctx.revert()
  }, [clamped, c])

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <defs>
          <linearGradient id="cp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          ref={progressRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#cp-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <span className="text-3xl font-bold text-white">{label}</span>}
        {sublabel && (
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}
