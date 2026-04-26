import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { IconLock, IconUnlock } from './Icons'
import type { LockerAccessLog } from '../types'

type Group = { key: string; label: string; items: LockerAccessLog[] }

/**
 * Vertical timeline grouped by day. Animates the spine + dots + cards in on
 * mount. Scoped to this module only.
 */
export function AccessTimeline({ logs }: { logs: LockerAccessLog[] }) {
  const groups = useMemo(() => groupByDay(logs), [logs])
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-spine]',
        { scaleY: 0, transformOrigin: 'top' },
        { scaleY: 1, duration: 0.6, ease: 'power3.out' },
      )
      gsap.fromTo(
        '[data-dot]',
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.04, delay: 0.15 },
      )
      gsap.fromTo(
        '[data-card]',
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out', stagger: 0.04, delay: 0.15 },
      )
    }, el)
    return () => ctx.revert()
  }, [logs.length])

  if (logs.length === 0) {
    return null
  }

  return (
    <div ref={rootRef} className="px-6 py-5">
      {groups.map((group) => (
        <div key={group.key} className="mb-6 last:mb-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {group.label}
            <span className="text-slate-500">&middot;</span>
            <span className="text-slate-300">{group.items.length}</span>
          </div>
          <ol className="relative ml-3 space-y-3 pl-6">
            {/* Vertical spine */}
            <span
              data-spine
              aria-hidden
              className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-blue-400/40 via-white/10 to-transparent"
            />
            {group.items.map((log) => (
              <li key={log.id} className="relative">
                {/* Dot */}
                <span
                  data-dot
                  aria-hidden
                  className={[
                    'absolute -left-[27px] top-2 flex size-4 items-center justify-center rounded-full border-2',
                    log.action === 'OPEN'
                      ? 'border-emerald-400/40 bg-emerald-500/25 shadow-[0_0_14px_-2px_rgba(16,185,129,0.55)]'
                      : 'border-slate-400/40 bg-slate-500/30',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'size-1.5 rounded-full',
                      log.action === 'OPEN' ? 'bg-emerald-300' : 'bg-slate-200',
                    ].join(' ')}
                  />
                </span>
                {/* Card */}
                <div
                  data-card
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <span
                    className={[
                      'flex size-8 shrink-0 items-center justify-center rounded-lg',
                      log.action === 'OPEN'
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : 'bg-slate-500/15 text-slate-200',
                    ].join(' ')}
                  >
                    {log.action === 'OPEN' ? (
                      <IconUnlock className="size-4" />
                    ) : (
                      <IconLock className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">
                      <span className="font-semibold">{log.memberName}</span>
                      <span className="text-slate-400">
                        {' '}
                        {log.action === 'OPEN' ? 'opened' : 'closed'} locker
                      </span>
                      <span className="font-semibold"> {log.lockerNumber}</span>
                    </p>
                    <p className="truncate text-[11px] text-slate-500">{formatTime(log.accessTime)}</p>
                  </div>
                  <span
                    className={[
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      log.action === 'OPEN'
                        ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-400/25 bg-slate-500/10 text-slate-200',
                    ].join(' ')}
                  >
                    {log.action}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}

function groupByDay(logs: LockerAccessLog[]): Group[] {
  const map = new Map<string, Group>()
  for (const log of logs) {
    const d = new Date(log.accessTime)
    const key = d.toISOString().slice(0, 10)
    if (!map.has(key)) {
      map.set(key, { key, label: formatDayLabel(d), items: [] })
    }
    map.get(key)!.items.push(log)
  }
  return Array.from(map.values())
}

function formatDayLabel(d: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(d)
  day.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - day.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return day.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: day.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
