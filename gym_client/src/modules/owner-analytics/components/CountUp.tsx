import { useEffect, useRef, useState } from 'react'

/**
 * Dependency-free animated counter, eased with power2.out.
 * Module-scoped copy so Owner Analytics stays self-contained.
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
    const ease = (t: number) => 1 - Math.pow(1 - t, 2)

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setDisplay(from + diff * ease(t))
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
  return (
    <span className={className}>
      {format ? format(rounded) : rounded.toLocaleString('en-IN')}
    </span>
  )
}
