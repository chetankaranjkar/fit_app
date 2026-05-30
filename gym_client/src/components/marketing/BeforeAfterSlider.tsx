import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  before: string
  after: string
  name?: string
  duration?: string
  result?: string
  trainer?: string
}

export function BeforeAfterSlider({ before, after, name, duration, result, trainer }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState(50)
  const dragging = useRef(false)

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.max(0, Math.min(100, pct)))
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return
      const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
      setFromClientX(x)
    }
    const onUp = () => {
      dragging.current = false
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
    }
  }, [setFromClientX])

  return (
    <div
      ref={wrapRef}
      className="group relative aspect-[4/5] select-none overflow-hidden rounded-3xl border border-[rgba(245,196,0,0.25)] bg-black shadow-[0_30px_80px_-30px_rgba(245,196,0,0.45)]"
      onMouseDown={(e) => {
        dragging.current = true
        setFromClientX(e.clientX)
      }}
      onTouchStart={(e) => {
        dragging.current = true
        setFromClientX(e.touches[0].clientX)
      }}
    >
      {/* After (full) */}
      <img
        src={after}
        alt="After"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* Before (clipped by pos) */}
      <img
        src={before}
        alt="Before"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />

      {/* Labels */}
      <span className="font-display absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
        Before
      </span>
      <span className="font-display absolute right-3 top-3 rounded-full gradient-tiger px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black tiger-glow-soft">
        After
      </span>

      {/* Divider line + handle */}
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -left-px w-0.5 bg-[#F5C400] shadow-[0_0_20px_rgba(245,196,0,0.7)]" />
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(245,196,0,0.5)] bg-black p-2 shadow-[0_8px_24px_-4px_rgba(245,196,0,0.6)] backdrop-blur">
          <svg viewBox="0 0 24 24" className="size-4 text-[#F5C400]" fill="none" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
          </svg>
        </div>
      </div>

      {/* Info footer */}
      {(name || duration || result || trainer) && (
        <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-[rgba(245,196,0,0.25)] bg-black/80 p-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {name && <p className="font-display truncate text-sm font-semibold uppercase tracking-wide text-white">{name}</p>}
              {duration && <p className="truncate text-xs text-[#B0B0B0]">{duration}</p>}
            </div>
            {result && (
              <span className="font-display shrink-0 rounded-full gradient-tiger px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-black">
                {result}
              </span>
            )}
          </div>
          {trainer && (
            <div className="mt-2 flex items-center gap-1.5 border-t border-[rgba(245,196,0,0.15)] pt-2 text-[11px] text-[#9a9a9a]">
              <svg viewBox="0 0 24 24" className="size-3.5 text-[#F5C400]" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Coached by <span className="font-semibold text-white">{trainer}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
