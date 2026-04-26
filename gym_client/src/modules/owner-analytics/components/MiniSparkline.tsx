import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import type { RevenuePoint } from '../types'

/**
 * Lightweight SVG sparkline. No chart library needed.
 * Renders an area + line and animates the line length on mount.
 */
export function MiniSparkline({
  data,
  width = 440,
  height = 120,
  stroke = '#60a5fa',
  fill = 'rgba(96,165,250,0.18)',
  className,
}: {
  data: RevenuePoint[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
  className?: string
}) {
  const pathRef = useRef<SVGPathElement>(null)
  const areaRef = useRef<SVGPathElement>(null)

  const { linePath, areaPath, min, max } = useMemo(() => {
    if (data.length === 0) {
      return { linePath: '', areaPath: '', min: 0, max: 0 }
    }
    const vals = data.map((d) => d.amount)
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const padding = 8
    const innerW = width - padding * 2
    const innerH = height - padding * 2
    const range = hi - lo || 1
    const stepX = innerW / Math.max(1, data.length - 1)

    const pts = data.map((d, i) => {
      const x = padding + stepX * i
      const y = padding + innerH - ((d.amount - lo) / range) * innerH
      return [x, y] as const
    })

    const line = pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(' ')
    const area =
      `${line} L${pts[pts.length - 1][0].toFixed(2)},${(height - padding).toFixed(2)} ` +
      `L${pts[0][0].toFixed(2)},${(height - padding).toFixed(2)} Z`
    return { linePath: line, areaPath: area, min: lo, max: hi }
  }, [data, width, height])

  useEffect(() => {
    const line = pathRef.current
    const area = areaRef.current
    if (!line) return
    const ctx = gsap.context(() => {
      const length = line.getTotalLength()
      gsap.set(line, { strokeDasharray: length, strokeDashoffset: length })
      gsap.to(line, {
        strokeDashoffset: 0,
        duration: 0.7,
        ease: 'power3.out',
      })
      if (area) {
        gsap.fromTo(
          area,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.2 },
        )
      }
    })
    return () => ctx.revert()
  }, [linePath])

  if (!linePath) return null

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={['block h-full w-full', className].filter(Boolean).join(' ')}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Revenue trend, min \u20b9${min.toLocaleString('en-IN')}, max \u20b9${max.toLocaleString('en-IN')}`}
    >
      <defs>
        <linearGradient id="oa-spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path ref={areaRef} d={areaPath} fill={fill || 'url(#oa-spark-grad)'} />
      <path
        ref={pathRef}
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
