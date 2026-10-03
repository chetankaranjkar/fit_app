import { serviceDaysUntil, serviceUrgency } from '../../../lib/opsWorkStatus'

/**
 * Shows a warning badge when `nextServiceDate` is in the past or within the
 * next 7 calendar days. Used on Equipment rows (service-alert smart feature).
 */
export function ServiceAlertBadge({ nextServiceDate }: { nextServiceDate?: string }) {
  if (!nextServiceDate) return <span className="text-[11px] text-slate-500">No due date</span>
  const urgency = serviceUrgency(nextServiceDate)
  const diffDays = serviceDaysUntil(nextServiceDate)
  if (diffDays == null || urgency === 'scheduled') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
        <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Due {diffDays != null ? `in ${diffDays}d` : '—'}
      </span>
    )
  }

  const overdue = urgency === 'overdue'
  const cls = overdue
    ? 'bg-rose-500/10 text-rose-300 border-rose-400/30'
    : 'bg-amber-500/10 text-amber-300 border-amber-400/25'

  const label = overdue
    ? `Overdue by ${Math.abs(diffDays)}d`
    : diffDays === 0
      ? 'Service due today'
      : `Service in ${diffDays}d`

  return (
    <span
      data-testid="service-urgency"
      data-urgency={urgency}
      className={[
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold',
        cls,
      ].join(' ')}
    >
      <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.2 16a2 2 0 001.73 3z"
        />
      </svg>
      {label}
    </span>
  )
}
