import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { membershipApprovalRequestsService } from '../../services/membershipApprovalRequests.service'
import { membershipPlansService } from '../../services/membershipPlans.service'
import { getApiErrorMessage } from '../../lib/apiErrors'
import {
  membershipFormLabelClass,
  membershipFormSelectClass,
  membershipStatusLabel,
  membershipStatusOptions,
} from '../../lib/membershipFormUtils'
import type { MembershipApprovalRequestType } from '../../types/membershipLifecycle'
import type { CreateUserMembershipDto, MembershipStatus, UserMembership } from '../../types/userMembership'

function inferRequestType(
  original: UserMembership,
  next: CreateUserMembershipDto,
): MembershipApprovalRequestType {
  const planChanged = next.planId !== original.planId
  const datesChanged =
    next.startDate.slice(0, 10) !== original.startDate.slice(0, 10) ||
    next.endDate.slice(0, 10) !== original.endDate.slice(0, 10)
  const statusChanged = (next.status ?? original.status) !== original.status

  if (planChanged && !datesChanged && !statusChanged) return 'PlanChange'
  if (datesChanged && !planChanged && !statusChanged) return 'DateChange'
  if (statusChanged && !planChanged && !datesChanged) return 'Edit'
  return 'Edit'
}

export function RequestMembershipChangeModal({
  open,
  membership,
  form,
  onClose,
  onSubmitted,
}: {
  open: boolean
  membership: UserMembership | null
  form: CreateUserMembershipDto
  onClose: () => void
  onSubmitted: () => void
}) {
  const [reason, setReason] = useState('')

  const { data: plans = [] } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const { data } = await membershipPlansService.getAll()
      return data ?? []
    },
    enabled: open,
    staleTime: 60_000,
  })

  const requestType = useMemo(
    () => (membership ? inferRequestType(membership, form) : 'Edit'),
    [membership, form],
  )

  const submitMutation = useMutation({
    mutationFn: () =>
      membershipApprovalRequestsService.create({
        membershipId: membership!.id,
        requestType,
        reason: reason.trim(),
        proposedChangesJson: JSON.stringify({
          startDate: form.startDate.slice(0, 10),
          endDate: form.endDate.slice(0, 10),
          planId: form.planId,
          status: form.status ?? membership!.status,
        }),
      }),
    onSuccess: () => {
      toast.success('Change request submitted for admin approval')
      setReason('')
      onSubmitted()
      onClose()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to submit change request')),
  })

  if (!membership) return null

  const nextPlan = plans.find((p) => p.id === form.planId)

  return (
    <Modal open={open} onClose={onClose} title="Request membership change" size="wide">
      <div className="space-y-4">
        <div
          role="alert"
          className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          This membership has payment records. Plan, date, and status changes require admin approval.
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Request type</dt>
            <dd className="font-medium text-slate-100">{requestType}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Member</dt>
            <dd className="font-medium text-slate-100">
              {membership.userName ?? `User #${membership.userId}`}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Proposed plan</dt>
            <dd className="font-medium text-slate-100">
              {nextPlan?.planName ?? membership.planName ?? `Plan #${form.planId}`}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Proposed period</dt>
            <dd className="font-medium text-slate-100">
              {form.startDate.slice(0, 10)} – {form.endDate.slice(0, 10)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Proposed status</dt>
            <dd className="font-medium text-slate-100">
              {membershipStatusLabel[(form.status ?? membership.status) as MembershipStatus] ??
                form.status}
            </dd>
          </div>
        </dl>

        <div>
          <label className={membershipFormLabelClass}>
            Reason for change <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className={membershipFormSelectClass}
            placeholder="Explain why these membership details should change…"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!reason.trim() || submitMutation.isPending}
            isLoading={submitMutation.isPending}
            onClick={() => {
              if (!reason.trim()) {
                toast.error('Reason is required')
                return
              }
              submitMutation.mutate()
            }}
          >
            Submit for approval
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function membershipEditRequiresApproval(
  membership: UserMembership,
  form: CreateUserMembershipDto,
  hasPayments: boolean,
): boolean {
  if (!hasPayments) return false
  return (
    form.planId !== membership.planId ||
    form.startDate.slice(0, 10) !== membership.startDate.slice(0, 10) ||
    form.endDate.slice(0, 10) !== membership.endDate.slice(0, 10) ||
    (form.status ?? membership.status) !== membership.status
  )
}
