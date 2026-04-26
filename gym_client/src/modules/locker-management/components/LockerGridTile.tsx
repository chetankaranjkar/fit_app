import type { Locker } from '../types'
import { IconLock, IconUnlock, IconWrench } from './Icons'

/**
 * Visual "real locker" tile — rectangular like a gym locker door, with a
 * top accent bar, number + size, and a small status icon. Hover = scale +
 * glow via pure Tailwind (no GSAP to keep it snappy).
 */
const statusToTheme = {
  AVAILABLE: {
    ring: 'ring-1 ring-emerald-400/25',
    glow: 'hover:shadow-[0_0_32px_-8px_rgba(16,185,129,0.55)] hover:ring-emerald-400/50',
    bar: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    chip: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
    chipDot: 'bg-emerald-400',
    icon: IconUnlock,
    label: 'Available',
    iconBg: 'bg-emerald-500/15 text-emerald-200',
  },
  OCCUPIED: {
    ring: 'ring-1 ring-blue-400/25',
    glow: 'hover:shadow-[0_0_32px_-8px_rgba(59,130,246,0.6)] hover:ring-blue-400/50',
    bar: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    chip: 'bg-blue-500/15 text-blue-200 border-blue-400/30',
    chipDot: 'bg-blue-400',
    icon: IconLock,
    label: 'Occupied',
    iconBg: 'bg-blue-500/15 text-blue-200',
  },
  MAINTENANCE: {
    ring: 'ring-1 ring-amber-400/30',
    glow: 'hover:shadow-[0_0_32px_-8px_rgba(245,158,11,0.6)] hover:ring-amber-400/55',
    bar: 'bg-gradient-to-r from-amber-400 to-orange-500',
    chip: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
    chipDot: 'bg-amber-400',
    icon: IconWrench,
    label: 'Maintenance',
    iconBg: 'bg-amber-500/15 text-amber-200',
  },
} as const

export function LockerGridTile({
  locker,
  selected = false,
  onClick,
}: {
  locker: Locker
  selected?: boolean
  onClick?: (locker: Locker) => void
}) {
  const theme = statusToTheme[locker.status]
  const Icon = theme.icon
  return (
    <button
      type="button"
      data-tile
      onClick={() => onClick?.(locker)}
      className={[
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[rgba(14,14,32,0.75)] p-3.5 text-left transition-all duration-300',
        'hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-[rgba(18,18,40,0.85)] active:scale-[0.99]',
        theme.ring,
        theme.glow,
        selected
          ? 'ring-2 ring-blue-400/70 shadow-[0_0_0_3px_rgba(59,130,246,0.18)]'
          : '',
      ].join(' ')}
    >
      {/* Top accent bar */}
      <div aria-hidden className={`absolute inset-x-0 top-0 h-0.5 ${theme.bar}`} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Locker
          </p>
          <p className="mt-0.5 truncate text-lg font-bold text-white">{locker.lockerNumber}</p>
        </div>
        <span
          className={`flex size-8 items-center justify-center rounded-xl ${theme.iconBg} transition group-hover:scale-110`}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] uppercase tracking-wider text-slate-500">
          {locker.size}
          {locker.location ? ` \u00b7 ${locker.location}` : ''}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${theme.chip}`}
        >
          <span className="relative inline-block size-1 rounded-full">
            <span className={`absolute inset-0 rounded-full ${theme.chipDot}`} />
            {locker.status === 'MAINTENANCE' && (
              <span
                aria-hidden
                className={`absolute inset-0 animate-ping rounded-full opacity-70 ${theme.chipDot}`}
              />
            )}
          </span>
          {theme.label}
        </span>
      </div>

      {/* Subtle locker "hinge" slits at right edge to reinforce the physical metaphor */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-1.5 top-5 flex h-10 w-0.5 flex-col justify-between"
      >
        <span className="block h-2 w-0.5 rounded-full bg-white/10" />
        <span className="block h-2 w-0.5 rounded-full bg-white/10" />
      </span>
    </button>
  )
}
