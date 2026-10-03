import type { DeliveryDisplayStatus } from '../../types/notificationChannels'

const styles: Record<string, string> = {
  Queued: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  Retrying: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  Sent: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  Failed: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  Skipped: 'border-white/15 bg-white/5 text-slate-400',
}

export function DeliveryStatusBadge({ status }: { status: DeliveryDisplayStatus }) {
  const label = status || 'Queued'
  const cls = styles[label] ?? 'border-white/15 bg-white/5 text-slate-300'
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  )
}
