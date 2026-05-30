import type { MemberSupplementStatus } from '../types/supplementTracking'

const STYLES: Record<MemberSupplementStatus, string> = {
  Active: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  Expired: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
  Completed: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
  Cancelled: 'border-rose-500/35 bg-rose-500/10 text-rose-200',
}

export function SupplementStatusBadge({ status }: { status: MemberSupplementStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STYLES[status] ?? STYLES.Active}`}
    >
      {status}
    </span>
  )
}
