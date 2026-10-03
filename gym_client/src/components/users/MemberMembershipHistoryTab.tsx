import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { getMembershipCollectPaymentPath } from '../../lib/membershipPaymentNavigation'
import { deriveMemberMembershipModalState } from '../../lib/memberMembershipState'
import {
  COLLECT_OUTSTANDING_LABEL,
  STANDING_TONE_TEXT,
  standingFromUserMembership,
} from '../../lib/membershipStanding'
import { MembershipAuditTrail } from '../memberships/MembershipAuditTrail'
import { MembershipStandingPanel, StandingFactValue } from '../memberships/MembershipStandingPanel'
import {
  listMembershipsForUser,
  userMembershipsByUserQueryKey,
} from '../../services/userMemberships.service'
import { authService } from '../../services/auth.service'
import { Button } from '../ui/Button'
import { MembershipStatusBadge } from '../billing/MembershipStatusBadge'
import type { MembershipStatus, UserMembership } from '../../types/userMembership'

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
              <th className="px-4 py-2">Membership dates</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Payment status</th>
              <th className="px-4 py-2 text-right">Outstanding</th>
              <th className="px-4 py-2">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((m) => {
              const standing = standingFromUserMembership(m)
              const collectable = onCollectPayment && getMembershipCollectPaymentPath(m)
              return (
              <tr key={m.id} data-membership-row={m.id}>
                <td className="px-4 py-3">{m.planName ?? `Plan #${m.planId}`}</td>
                <td className="px-4 py-3">
                  <StandingFactValue fact={standing.dates} compact />
                </td>
                <td className="px-4 py-3">
                  <MembershipStatusBadge
                    status={m.status}
                    onClick={collectable ? () => onCollectPayment!(m) : undefined}
                    title={collectable ? COLLECT_OUTSTANDING_LABEL : undefined}
                  />
                </td>
                <td className="px-4 py-3">
                  <StandingFactValue fact={standing.payment} compact />
                </td>
                <td className={`px-4 py-3 text-right text-xs tabular-nums ${STANDING_TONE_TEXT[standing.outstanding.tone]}`}>
                  {standing.outstanding.label}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/dashboard/user-memberships?membershipId=${m.id}`}
                    className="font-mono text-xs text-blue-300 hover:text-blue-200"
                    title="Open in member plans registry"
                  >
                    #{m.id}
                  </Link>
                </td>
              </tr>
              )
            })}
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
  onRenewMembership?: (membership: UserMembership) => void
}) {
  const navigate = useNavigate()
  const canManageMemberships = canManageProp ?? authService.canPaymentsAccess()

  const handleCollectPayment = (m: UserMembership) => {
    const path = getMembershipCollectPaymentPath(m, `/dashboard/users/${userId}`)
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
  const focusMembership =
    modalState.occupyingMembership ??
    modalState.latestExpired ??
    [...memberships].sort((a, b) => b.endDate.localeCompare(a.endDate) || b.id - a.id)[0]
  const focusStanding = focusMembership ? standingFromUserMembership(focusMembership) : null
  const focusCollectPath = focusMembership
    ? getMembershipCollectPaymentPath(focusMembership, `/dashboard/users/${userId}`)
    : null

  return (
    <div className="space-y-8">
      {focusMembership && focusStanding ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MembershipStatusBadge status={focusMembership.status} />
            <span className="text-xs text-slate-400">
              {modalState.state === 'has_active' ? 'Current membership' : 'Latest membership'} #{focusMembership.id}
            </span>
          </div>
          <MembershipStandingPanel
            standing={focusStanding}
            canManage={canManageMemberships}
            collect={focusCollectPath ? { to: focusCollectPath } : undefined}
            renew={
              focusStanding.renew.mode === 'new' && focusMembership.status !== 'Expired'
                ? onAddMembership
                  ? { onClick: onAddMembership }
                  : undefined
                : onRenewMembership
                  ? { onClick: () => onRenewMembership(focusMembership) }
                  : undefined
            }
            resolve={{ to: `/dashboard/user-memberships?membershipId=${focusMembership.id}` }}
          />
          {modalState.state === 'expired_history_only' && canManageMemberships && onAddMembership ? (
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={onAddMembership}>
                + New membership (different plan)
              </Button>
            </div>
          ) : null}
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
