import { useQuery } from '@tanstack/react-query'
import { membershipAuditService, type MembershipAuditLog } from '../../services/membershipAudit.service'

const actionLabel: Record<string, string> = {
  Created: 'Membership created',
  Updated: 'Membership updated',
  Renewed: 'Membership renewed',
  CancelRequested: 'Cancel requested',
  CancelApproved: 'Cancel approved',
  VoidRequested: 'Void requested',
  VoidApproved: 'Void approved',
  VoidRejected: 'Void rejected',
  FeeChanged: 'Fee changed',
  PlanChanged: 'Plan changed',
  DateChanged: 'Dates changed',
  StatusChanged: 'Status changed',
  TransferRequested: 'Transfer requested',
  TransferApproved: 'Transfer approved',
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function AuditRow({ log }: { log: MembershipAuditLog }) {
  const label = actionLabel[log.action] ?? log.action
  const isCreate = log.action === 'Created'
  return (
    <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-slate-100">{label}</span>
        <span className="font-mono text-xs text-slate-500">#{log.membershipId}</span>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {formatWhen(log.performedDate)} ·{' '}
        <span className={isCreate ? 'text-amber-200' : 'text-slate-300'}>
          {log.performedByName?.trim() || `User #${log.performedByUserId}`}
        </span>
      </p>
      {(log.oldValue || log.newValue) && (
        <p className="mt-1 break-all text-xs text-slate-500">
          {log.oldValue ? `From: ${log.oldValue}` : null}
          {log.oldValue && log.newValue ? ' → ' : null}
          {log.newValue ? `To: ${log.newValue}` : null}
        </p>
      )}
    </li>
  )
}

export function MembershipAuditTrail({
  membershipId,
  userId,
  title = 'Audit trail',
  maxHeightClass = 'max-h-64',
}: {
  membershipId?: number
  userId?: number
  title?: string
  maxHeightClass?: string
}) {
  const enabled = (membershipId != null && membershipId > 0) || (userId != null && userId > 0)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['membership-audit', membershipId ?? null, userId ?? null],
    queryFn: () =>
      membershipAuditService.list({
        membershipId: membershipId && membershipId > 0 ? membershipId : undefined,
        userId: userId && userId > 0 ? userId : undefined,
      }),
    enabled,
  })

  if (!enabled) return null

  return (
    <section className="mt-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h4>
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading audit trail…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-slate-500">No audit entries yet.</p>
      ) : (
        <ul className={`space-y-2 overflow-y-auto pr-1 ${maxHeightClass}`}>
          {logs.map((log) => (
            <AuditRow key={log.id} log={log} />
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-slate-500">
        <strong className="text-slate-400">Created</strong> shows who originally added the membership (e.g.
        duplicate records).
      </p>
    </section>
  )
}
