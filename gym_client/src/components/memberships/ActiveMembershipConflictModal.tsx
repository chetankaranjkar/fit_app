import { Link } from 'react-router-dom'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { MembershipStatusBadge } from '../billing/MembershipStatusBadge'
import type { ActiveMembershipConflict } from '../../types/activeMembershipConflict'

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

export function ActiveMembershipConflictModal({
  open,
  conflict,
  onClose,
  onRenew,
  onUpgrade,
}: {
  open: boolean
  conflict: ActiveMembershipConflict | null
  onClose: () => void
  onRenew: (conflict: ActiveMembershipConflict) => void
  onUpgrade: (conflict: ActiveMembershipConflict) => void
}) {
  if (!conflict) return null

  const viewHref = `/dashboard/users/${conflict.userId}`

  return (
    <Modal open={open} onClose={onClose} title="Membership already exists" size="wide">
      <p className="mb-4 text-sm text-amber-100">{conflict.message}</p>
      <dl className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm sm:grid-cols-2">
        {conflict.existingStatus ? (
          <div>
            <dt className="text-slate-500">Current status</dt>
            <dd className="mt-1">
              <MembershipStatusBadge status={conflict.existingStatus} />
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-slate-500">Current plan</dt>
          <dd className="font-medium text-white">{conflict.planName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Remaining days</dt>
          <dd className="font-medium text-white">{conflict.remainingDays}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Start date</dt>
          <dd className="text-slate-200">{formatDate(conflict.startDate)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">End date</dt>
          <dd className="text-slate-200">{formatDate(conflict.endDate)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Link
          to={viewHref}
          className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
          onClick={onClose}
        >
          View membership
        </Link>
        <Button type="button" variant="secondary" onClick={() => onRenew(conflict)}>
          Renew membership
        </Button>
        <Button type="button" variant="primary" onClick={() => onUpgrade(conflict)}>
          Upgrade membership
        </Button>
      </div>
    </Modal>
  )
}
