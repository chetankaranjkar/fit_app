import type { HealthRiskLevel } from '../types/healthProfile'

const styles: Record<HealthRiskLevel, string> = {
  Low: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  Moderate: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  High: 'border-rose-500/50 bg-rose-500/15 text-rose-200',
}

export function HealthRiskBadge({ level, className = '' }: { level: HealthRiskLevel; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${styles[level]} ${className}`}
    >
      {level} risk
    </span>
  )
}
