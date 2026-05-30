import type { HealthProfileSummary } from '../types/healthProfile'
import { HealthRiskBadge } from './HealthRiskBadge'

interface Props {
  summary: HealthProfileSummary | null | undefined
  loading?: boolean
  compact?: boolean
}

export function TrainerHealthAlertPanel({ summary, loading, compact }: Props) {
  if (loading) {
    return (
      <div className="glass-card animate-pulse rounded-2xl border border-white/10 p-4">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="mt-3 h-3 w-full rounded bg-white/5" />
      </div>
    )
  }

  if (!summary) return null

  if (!summary.isCompleted && summary.medicalConditionLabels.length === 0 && summary.activeInjuries.length === 0) {
    return (
      <div className="glass-card rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
        <p className="text-sm font-semibold text-amber-200">Health profile incomplete</p>
        <p className="mt-1 text-xs text-slate-400">
          Complete the member&apos;s Health Profile before assigning intense workouts.
        </p>
      </div>
    )
  }

  const isHigh = summary.riskLevel === 'High' || summary.requiresMedicalClearance

  return (
    <div
      className={`glass-card-strong rounded-2xl border p-4 ${
        isHigh ? 'border-rose-500/35 tiger-glow-soft' : 'border-[rgba(245,196,0,0.2)]'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F5C400]/80">
            Health profile
          </p>
          {!compact && summary.memberName && (
            <p className="mt-1 font-display text-lg text-white">{summary.memberName}</p>
          )}
        </div>
        <HealthRiskBadge level={summary.riskLevel} />
      </div>

      {summary.medicalConditionLabels.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Conditions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.medicalConditionLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.activeInjuries.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Injuries</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
            {summary.activeInjuries.map((injury, i) => (
              <li key={`${injury.bodyPart}-${i}`} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#F5C400]" />
                {injury.bodyPart} — {injury.injuryType} ({injury.status})
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.exerciseRestrictions.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/5 bg-black/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Restrictions</p>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-slate-400">
            {summary.exerciseRestrictions.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </div>
      )}

      {summary.requiresMedicalClearance && (
        <p className="mt-3 text-xs font-medium text-rose-300">
          PAR-Q flagged — medical clearance recommended before exercise prescription.
        </p>
      )}
    </div>
  )
}
