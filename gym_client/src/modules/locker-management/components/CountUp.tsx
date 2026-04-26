import { useEffect, useRef, useState } from 'react'

/**
 * Number-tween on mount/value-change. Uses requestAnimationFrame + `power2.out`
 * equivalent easing. No external deps.
 */
export function CountUp({
  value,
  duration = 900,
  format,
  className,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | null>(null)
  const fromRef = useRef(0)

  useEffect(() => {
    const start = performance.now()
    const from = fromRef.current
    const diff = value - from
    const ease = (t: number) => 1 - Math.pow(1 - t, 2) // power2.out

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = ease(t)
      setDisplay(from + diff * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  const rounded = Math.round(display)
  return <span className={className}>{format ? format(rounded) : rounded.toLocaleString('en-IN')}</span>
}
