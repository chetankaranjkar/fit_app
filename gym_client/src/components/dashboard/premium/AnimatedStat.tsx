import { useEffect, useState } from 'react'

export function AnimatedStat({
  value,
  format = (n) => String(n),
  className = '',
}: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const start = display
    const end = value
    if (start === end) return
    const duration = 220
    const t0 = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - (1 - p) ** 3
      setDisplay(Math.round(start + (end - start) * eased))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <span className={className}>{format(display)}</span>
}
