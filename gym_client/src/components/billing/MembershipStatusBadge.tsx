import { StatusBadge, type StatusBadgeVariant } from '../data-grid/StatusBadge'
import type { MembershipStatus } from '../../types/userMembership'

const statusLabel: Record<MembershipStatus, string> = {
  Active: 'Active',
  ActivePendingPayment: 'Pending payment',
  PartialPayment: 'Partial payment',
  Paused: 'Paused',
  Expired: 'Expired',
}

const variantMap: Record<MembershipStatus, StatusBadgeVariant> = {
  Active: 'success',
  ActivePendingPayment: 'info',
  PartialPayment: 'warning',
  Paused: 'warning',
  Expired: 'neutral',
}

export function MembershipStatusBadge({
  status,
  onClick,
  title,
}: {
  status: MembershipStatus
  onClick?: () => void
  title?: string
}) {
  const label = statusLabel[status]
  const variant = variantMap[status]

  if (!onClick) {
    return (
      <StatusBadge variant={variant} dot>
        {label}
      </StatusBadge>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="max-w-full rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400/50"
    >
      <StatusBadge variant={variant} dot className="cursor-pointer hover:opacity-90">
        {label}
      </StatusBadge>
    </button>
  )
}
