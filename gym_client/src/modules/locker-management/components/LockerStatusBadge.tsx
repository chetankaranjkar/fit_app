import type { LockerStatus } from '../types'

const styles: Record<LockerStatus, { label: string; cls: string; dot: string; pulse?: boolean }> = {
  AVAILABLE: {
    label: 'Available',
    cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/25 shadow-[0_0_18px_-10px_rgba(16,185,129,0.55)]',
    dot: 'bg-emerald-400',
  },
  OCCUPIED: {
    label: 'Occupied',
    cls: 'bg-blue-500/10 text-blue-300 border-blue-400/25',
    dot: 'bg-blue-400',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    cls: 'bg-amber-500/10 text-amber-300 border-amber-400/25 shadow-[0_0_18px_-10px_rgba(245,158,11,0.7)]',
    dot: 'bg-amber-400',
    pulse: true,
  },
}

/**
 * Colored status pill for locker state. Only MAINTENANCE animates the dot
 * (soft pulse) per the design spec. Available + Occupied stay calm.
 */
export function LockerStatusBadge({ status }: { status: LockerStatus }) {
  const s = styles[status]
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        s.cls,
      ].join(' ')}
    >
      <span className={['relative inline-block size-1.5 rounded-full', s.dot].join(' ')}>
        {s.pulse && (
          <span
            aria-hidden
            className={['absolute inset-0 animate-ping rounded-full opacity-70', s.dot].join(' ')}
          />
        )}
      </span>
      {s.label}
    </span>
  )
}
