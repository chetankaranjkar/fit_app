import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  before: string
  after: string
  name?: string
  duration?: string
  result?: string
}

export function BeforeAfterSlider({ before, after, name, duration, result }: Props) {
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
      className="group relative aspect-[4/5] select-none overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_30px_80px_-30px_rgba(139,92,246,0.45)]"
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
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
        Before
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-[linear-gradient(135deg,#3b82f6,#a855f7)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
        After
      </span>

      {/* Divider line + handle */}
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -left-px w-0.5 bg-white/80 shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-white/90 p-2 shadow-lg backdrop-blur">
          <svg viewBox="0 0 24 24" className="size-4 text-slate-900" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
          </svg>
        </div>
      </div>

      {/* Info footer */}
      {(name || duration || result) && (
        <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/10 bg-[rgba(5,6,16,0.8)] p-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {name && <p className="truncate text-sm font-semibold text-white">{name}</p>}
              {duration && <p className="text-xs text-slate-400">{duration}</p>}
            </div>
            {result && (
              <span className="shrink-0 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/20">
                {result}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
