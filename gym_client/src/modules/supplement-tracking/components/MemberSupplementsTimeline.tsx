import type { MemberSupplement } from '../types/supplementTracking'
import { SupplementStatusBadge } from './SupplementStatusBadge'

interface Props {
  items: MemberSupplement[]
  emptyMessage?: string
}

export function MemberSupplementsTimeline({ items, emptyMessage = 'No assignment history yet.' }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>
  }

  const sorted = [...items].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  )

  return (
    <ol className="relative space-y-0 border-l border-white/10 pl-6">
      {sorted.map((item, index) => (
        <li key={item.id} className="relative pb-8 last:pb-0">
          <span
            className={`absolute -left-[1.65rem] top-1 flex size-3 rounded-full ring-4 ring-[#0a0f1a] ${
              item.isCurrentlyActive ? 'bg-[#F5C400]' : 'bg-slate-600'
            }`}
          />
          <div className="glass-card rounded-xl border border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{item.supplementName}</p>
                <p className="text-xs text-slate-400">
                  {item.startDate.slice(0, 10)}
                  {item.endDate ? ` – ${item.endDate.slice(0, 10)}` : ''}
                </p>
              </div>
              <SupplementStatusBadge status={item.status} />
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {item.dosage} · {item.timingLabel}
            </p>
            {item.assignedByName && (
              <p className="mt-1 text-[10px] text-slate-500">Assigned by {item.assignedByName}</p>
            )}
            {item.notes && <p className="mt-2 text-xs text-slate-400">{item.notes}</p>}
          </div>
          {index < sorted.length - 1 && <div className="h-2" />}
        </li>
      ))}
    </ol>
  )
}
