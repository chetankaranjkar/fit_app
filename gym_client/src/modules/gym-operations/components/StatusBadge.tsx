import type { EquipmentStatus } from '../types'

const styles: Record<EquipmentStatus, { label: string; cls: string; pulse?: boolean }> = {
  OPERATIONAL: {
    label: 'Operational',
    cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20',
  },
  UNDER_MAINTENANCE: {
    label: 'Maintenance',
    cls: 'bg-amber-500/10 text-amber-300 border-amber-400/20',
  },
  OUT_OF_ORDER: {
    label: 'Out of order',
    cls: 'bg-rose-500/10 text-rose-300 border-rose-400/30',
    pulse: true,
  },
  RETIRED: {
    label: 'Retired',
    cls: 'bg-slate-500/10 text-slate-400 border-slate-400/20',
  },
}

export function StatusBadge({ status }: { status: EquipmentStatus }) {
  const s = styles[status]
  return (
    <span
      className={[
        'relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        s.cls,
      ].join(' ')}
    >
      <span
        className={[
          'relative inline-block size-1.5 rounded-full',
          status === 'OPERATIONAL' && 'bg-emerald-400',
          status === 'UNDER_MAINTENANCE' && 'bg-amber-400',
          status === 'OUT_OF_ORDER' && 'bg-rose-400',
          status === 'RETIRED' && 'bg-slate-400',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {s.pulse && (
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-rose-400 opacity-75"
          />
        )}
      </span>
      {s.label}
    </span>
  )
}
