import { useEffect, useState } from 'react'

function formatElapsed(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Elapsed time since session start; ticks every second. */
export function SessionTimer({ startedAtUtc }: { startedAtUtc: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startedAtUtc).getTime()
    const tick = () => {
      const sec = Math.max(0, Math.floor((Date.now() - start) / 1000))
      setElapsed(sec)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startedAtUtc])

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200/80">Session time</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-white">{formatElapsed(elapsed)}</p>
    </div>
  )
}
