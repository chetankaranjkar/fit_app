import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SlideOverPanel } from '../ui/SlideOverPanel'
import { Button } from '../ui/Button'
import { MembershipStatusBadge } from '../billing/MembershipStatusBadge'
import { MembershipAuditTrail } from './MembershipAuditTrail'
import { membershipPaymentsService } from '../../services/membershipPayments.service'
import { userMembershipsService } from '../../services/userMemberships.service'
import { authService } from '../../services/auth.service'
import { formatInr } from '../../lib/formatInr'
import {
  collectPaymentPath,
  getMembershipCollectPaymentPath,
  memberMembershipHistoryPath,
} from '../../lib/membershipPaymentNavigation'
import {
  membershipDaysLeftClass,
  membershipDaysLeftLabel,
  membershipPaymentSummary,
} from '../../lib/userMembershipListUtils'
import type { UserMembership } from '../../types/userMembership'

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

type UserMembershipDetailDrawerProps = {
  membership: UserMembership | null
  open: boolean
  returnTo: string
  onClose: () => void
  onEdit: (membership: UserMembership) => void
  onRenew: (membership: UserMembership) => void
  onRequestVoid: (membership: UserMembership) => void
  onRevertLastRenewal?: (membership: UserMembership) => void
}

export function UserMembershipDetailDrawer({
  membership,
  open,
  returnTo,
  onClose,
  onEdit,
  onRenew,
  onRequestVoid,
  onRevertLastRenewal,
}: UserMembershipDetailDrawerProps) {
  const navigate = useNavigate()
  const canViewAudit = authService.canViewMembershipAudit()

  const { data: revertPreview } = useQuery({
    queryKey: ['membership-revert-preview', membership?.id],
    queryFn: () => userMembershipsService.getLastRenewalRevertPreview(membership!.id),
    enabled: open && membership != null && membership.id > 0,
  })

  const { data: financial, isLoading: financialLoading } = useQuery({
    queryKey: ['membership-financial-summary', membership?.id],
    queryFn: async () => {
      const { data } = await membershipPaymentsService.financialSummary(membership!.id)
      return data
    },
    enabled: open && membership != null,
  })

  if (!membership) return null

  const collectPath = getMembershipCollectPaymentPath(membership, returnTo)
  const memberName = membership.userName ?? financial?.memberName ?? `User #${membership.userId}`
  const memberPhoto = financial?.memberPhotoUrl

  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      title={`Membership #${membership.id}`}
      subtitle={`${memberName} · ${membership.planName ?? 'Plan'}`}
      footer={
        <div className="flex flex-wrap gap-2">
          {collectPath ? (
            <Button type="button" className="flex-1" onClick={() => navigate(collectPath)}>
              Collect payment
            </Button>
          ) : null}
          {membership.status === 'Expired' ||
          membership.status === 'Active' ||
          membership.status === 'ActivePendingPayment' ||
          membership.status === 'PartialPayment' ? (
            <Button type="button" variant="secondary" className="flex-1" onClick={() => onRenew(membership)}>
              Renew
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => onEdit(membership)}>
            Edit
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
          {memberPhoto ? (
            <img src={memberPhoto} alt="" className="size-14 rounded-full object-cover ring-2 ring-white/10" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full bg-slate-700 text-lg font-semibold text-white">
              {memberName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{memberName}</p>
            <p className="text-xs text-slate-400">
              {financial?.memberCode ? `ID ${financial.memberCode}` : null}
              {membership.memberPhone ? ` · ${membership.memberPhone}` : null}
            </p>
            <div className="mt-2">
              <MembershipStatusBadge status={membership.status} />
            </div>
          </div>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Plan</dt>
            <dd className="font-medium text-slate-100">{membership.planName ?? `Plan #${membership.planId}`}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Timeline</dt>
            <dd className={`font-medium ${membershipDaysLeftClass(membership)}`}>
              {membershipDaysLeftLabel(membership)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Period</dt>
            <dd className="font-medium text-slate-100">
              {formatDate(membership.startDate)} – {formatDate(membership.endDate)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Payment</dt>
            <dd className="font-medium text-slate-100">{membershipPaymentSummary(membership)}</dd>
          </div>
        </dl>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Billing summary</h3>
          {financialLoading ? (
            <p className="mt-2 text-sm text-slate-500">Loading billing…</p>
          ) : (
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Membership fee</dt>
                <dd className="tabular-nums text-slate-100">{formatInr(financial?.membershipFee ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Total paid</dt>
                <dd className="tabular-nums text-emerald-300">{formatInr(financial?.totalPaid ?? 0)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Outstanding</dt>
                <dd className="tabular-nums text-amber-200">
                  {formatInr(financial?.outstandingBalance ?? membership.pendingAmount ?? 0)}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {canViewAudit ? (
          <MembershipAuditTrail membershipId={membership.id} title="Activity log" maxHeightClass="max-h-48" />
        ) : null}

        <div className="flex flex-col gap-2">
          <Link
            to={memberMembershipHistoryPath(membership.userId)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-semibold text-slate-200 hover:bg-white/10"
            onClick={onClose}
          >
            Membership history
          </Link>
          <Link
            to={`/dashboard/users/${membership.userId}?mode=view&tab=payment-history`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-semibold text-slate-200 hover:bg-white/10"
            onClick={onClose}
          >
            Payment history
          </Link>
          {membership.status !== 'Voided' && membership.status !== 'Transferred' ? (
            <>
              {revertPreview && onRevertLastRenewal ? (
                <button
                  type="button"
                  onClick={() => {
                    onRevertLastRenewal(membership)
                    onClose()
                  }}
                  className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/20"
                >
                  Revert last renewal
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onRequestVoid(membership)
                  onClose()
                }}
                className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/20"
              >
                Request void
              </button>
            </>
          ) : null}
        </div>
      </div>
    </SlideOverPanel>
  )
}
