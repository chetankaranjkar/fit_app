import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  getMembershipCollectPaymentPath,
  membershipStatusClickTitle,
} from '../../lib/membershipPaymentNavigation'
import {
  deriveMemberMembershipModalState,
  formatMembershipDisplayDate,
} from '../../lib/memberMembershipState'
import { MembershipAuditTrail } from '../memberships/MembershipAuditTrail'
import {
  listMembershipsForUser,
  userMembershipsByUserQueryKey,
} from '../../services/userMemberships.service'
import { authService } from '../../services/auth.service'
import { Button } from '../ui/Button'
import { MembershipStatusBadge } from '../billing/MembershipStatusBadge'
import type { MembershipStatus, UserMembership } from '../../types/userMembership'

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

function sectionFor(status: MembershipStatus): 'current' | 'previous' | 'cancelled' | 'voided' | 'transferred' {
  if (status === 'Voided') return 'voided'
  if (status === 'Cancelled') return 'cancelled'
  if (status === 'Transferred') return 'transferred'
  if (status === 'Expired' || status === 'Paused') return 'previous'
  return 'current'
}

function MembershipTable({
  title,
  rows,
  onCollectPayment,
}: {
  title: string
  rows: UserMembership[]
  onCollectPayment?: (m: UserMembership) => void
}) {
  if (rows.length === 0) return null
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs text-slate-400">
            <tr>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">{m.planName ?? `Plan #${m.planId}`}</td>
                <td className="px-4 py-3 text-slate-300">
                  {formatDate(m.startDate)} – {formatDate(m.endDate)}
                </td>
                <td className="px-4 py-3">
                  <MembershipStatusBadge
                    status={m.status}
                    onClick={
                      onCollectPayment && getMembershipCollectPaymentPath(m)
                        ? () => onCollectPayment(m)
                        : undefined
                    }
                    title={membershipStatusClickTitle(m.status)}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/dashboard/user-memberships`}
                    className="font-mono text-xs text-blue-300 hover:text-blue-200"
                  >
                    #{m.id}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function MemberMembershipHistoryTab({
  userId,
  canManageMemberships: canManageProp,
  onAddMembership,
  onRenewMembership,
}: {
  userId: number
  canManageMemberships?: boolean
  onAddMembership?: () => void
  onRenewMembership?: (latestExpired: UserMembership) => void
}) {
  const navigate = useNavigate()
  const canManageMemberships = canManageProp ?? authService.canPaymentsAccess()

  const handleCollectPayment = (m: UserMembership) => {
    const path = getMembershipCollectPaymentPath(m)
    if (path) navigate(path)
  }

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: userMembershipsByUserQueryKey(userId),
    queryFn: () => listMembershipsForUser(userId),
    enabled: userId > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const modalState = useMemo(
    () => deriveMemberMembershipModalState(memberships, userId),
    [memberships, userId],
  )

  const grouped = useMemo(() => {
    const current: UserMembership[] = []
    const previous: UserMembership[] = []
    const cancelled: UserMembership[] = []
    const voided: UserMembership[] = []
    const transferred: UserMembership[] = []

    for (const m of memberships) {
      const bucket = sectionFor(m.status)
      if (bucket === 'current') current.push(m)
      else if (bucket === 'cancelled') cancelled.push(m)
      else if (bucket === 'voided') voided.push(m)
      else if (bucket === 'transferred') transferred.push(m)
      else previous.push(m)
    }

    return { current, previous, cancelled, voided, transferred }
  }, [memberships])

  const sectionCount =
    grouped.current.length +
    grouped.previous.length +
    grouped.cancelled.length +
    grouped.voided.length +
    grouped.transferred.length
  const showFlatFallback = memberships.length > 0 && sectionCount === 0

  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading membership history…</p>
  }

  if (memberships.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center">
        <p className="text-sm text-slate-300">No membership records found for this member.</p>
        {canManageMemberships && onAddMembership ? (
          <Button type="button" className="mt-4" onClick={onAddMembership}>
            + Add Membership
          </Button>
        ) : null}
      </div>
    )
  }

  const canViewAudit = authService.canViewMembershipAudit()

  return (
    <div className="space-y-8">
      {modalState.state === 'expired_history_only' && modalState.latestExpired ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <MembershipStatusBadge status="Expired" />
            <p className="text-sm text-amber-100">
              Membership expired on:{' '}
              <span className="font-medium">
                {formatMembershipDisplayDate(modalState.latestExpired.endDate)}
              </span>
            </p>
          </div>
          {canManageMemberships ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {modalState.canRenewMembership && onRenewMembership ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onRenewMembership(modalState.latestExpired!)}
                >
                  Renew Membership
                </Button>
              ) : null}
              {modalState.canAddMembership && onAddMembership ? (
                <Button type="button" onClick={onAddMembership}>
                  + New Membership
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {modalState.state === 'inactive_history_only' && canManageMemberships && onAddMembership ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={onAddMembership}>
            + Add Membership
          </Button>
        </div>
      ) : null}

      {showFlatFallback ? (
        <MembershipTable
          title="All memberships"
          rows={memberships}
          onCollectPayment={handleCollectPayment}
        />
      ) : null}
      <MembershipTable
        title="Current membership"
        rows={grouped.current}
        onCollectPayment={handleCollectPayment}
      />
      <MembershipTable
        title="Previous memberships"
        rows={grouped.previous}
        onCollectPayment={handleCollectPayment}
      />
      <MembershipTable
        title="Cancelled memberships"
        rows={grouped.cancelled}
        onCollectPayment={handleCollectPayment}
      />
      <MembershipTable
        title="Voided memberships"
        rows={grouped.voided}
        onCollectPayment={handleCollectPayment}
      />
      <MembershipTable
        title="Transferred memberships"
        rows={grouped.transferred}
        onCollectPayment={handleCollectPayment}
      />
      {canViewAudit ? (
        <MembershipAuditTrail
          userId={userId}
          title="Activity log (who created or changed memberships)"
          maxHeightClass="max-h-96"
        />
      ) : null}
    </div>
  )
}
