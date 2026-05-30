import type { MemberSupplement } from '../types/supplementTracking'
import { SupplementStatusBadge } from './SupplementStatusBadge'

interface Props {
  item: MemberSupplement
  onEdit?: () => void
  showMember?: boolean
}

export function SupplementCard({ item, onEdit, showMember }: Props) {
  const categoryColors: Record<string, string> = {
    Protein: 'from-amber-500/30 to-orange-600/20',
    Performance: 'from-violet-500/30 to-fuchsia-600/20',
    Recovery: 'from-emerald-500/30 to-teal-600/20',
    Vitamins: 'from-sky-500/30 to-blue-600/20',
    Health: 'from-rose-500/25 to-pink-600/15',
    Other: 'from-slate-500/25 to-slate-600/15',
  }

  return (
    <article className="glass-card-strong group relative overflow-hidden rounded-2xl border border-white/10 p-5 transition hover:border-[rgba(245,196,0,0.35)]">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br opacity-60 blur-2xl ${categoryColors[item.category] ?? categoryColors.Other}`}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F5C400]/75">
            {item.category}
          </p>
          <h3 className="mt-1 font-display text-xl text-white">{item.supplementName}</h3>
          {showMember && item.memberName && (
            <p className="mt-1 text-xs text-slate-400">{item.memberName}</p>
          )}
        </div>
        <SupplementStatusBadge status={item.status} />
      </div>

      <dl className="relative mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-500">Dosage</dt>
          <dd className="font-medium text-white">{item.dosage}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-500">Timing</dt>
          <dd className="font-medium text-white">{item.timingLabel}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-500">Duration</dt>
          <dd className="text-slate-300">
            {item.startDate.slice(0, 10)}
            {item.endDate ? ` → ${item.endDate.slice(0, 10)}` : ' → Ongoing'}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-500">Remaining</dt>
          <dd className="text-slate-300">
            {item.daysRemaining != null ? `${item.daysRemaining} days` : item.isCurrentlyActive ? 'Open-ended' : '—'}
          </dd>
        </div>
      </dl>

      {item.instructions && (
        <p className="relative mt-4 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs leading-relaxed text-slate-300">
          {item.instructions}
        </p>
      )}

      {item.productName && (
        <p className="relative mt-3 text-[10px] text-slate-500">
          Linked product: <span className="text-slate-300">{item.productName}</span>
        </p>
      )}

      {item.compliancePercent != null && item.isCurrentlyActive && (
        <div className="relative mt-4">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Compliance (est.)</span>
            <span>{item.compliancePercent}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#F5C400] to-amber-500"
              style={{ width: `${item.compliancePercent}%` }}
            />
          </div>
        </div>
      )}

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="relative mt-4 text-xs font-semibold text-[#F5C400] transition hover:text-amber-300"
        >
          Edit assignment →
        </button>
      )}
    </article>
  )
}
