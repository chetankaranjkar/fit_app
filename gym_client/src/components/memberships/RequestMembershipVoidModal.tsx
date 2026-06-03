import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { membershipPaymentsService } from '../../services/membershipPayments.service'
import { membershipApprovalRequestsService } from '../../services/membershipApprovalRequests.service'
import { formatInr } from '../../lib/formatInr'
import { getApiErrorMessage } from '../../lib/apiErrors'
import type { UserMembership } from '../../types/userMembership'

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

export function RequestMembershipVoidModal({
  open,
  membership,
  onClose,
  onSubmitted,
}: {
  open: boolean
  membership: UserMembership | null
  onClose: () => void
  onSubmitted: () => void
}) {
  const [reason, setReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: financial } = useQuery({
    queryKey: ['membership-payment', membership?.id],
    queryFn: async () => {
      const { data } = await membershipPaymentsService.financialSummary(membership!.id)
      return data
    },
    enabled: open && membership != null,
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      membershipApprovalRequestsService.create({
        membershipId: membership!.id,
        requestType: 'Void',
        reason: reason.trim(),
      }),
    onSuccess: () => {
      toast.success('Void request submitted for admin approval')
      setReason('')
      setConfirmOpen(false)
      onSubmitted()
      onClose()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to submit void request')),
  })

  const hasPayments =
    financial != null &&
    ((financial.totalPaid ?? 0) > 0 || (financial.outstandingBalance ?? 0) > 0)

  const handleSubmitClick = () => {
    if (!reason.trim()) {
      toast.error('Reason for void is required')
      return
    }
    setConfirmOpen(true)
  }

  if (!membership) return null

  const memberPhoto = financial?.memberPhotoUrl
  const memberName = financial?.memberName ?? membership.userName ?? 'Member'
  const memberCode = financial?.memberCode ?? `M-${membership.userId}`

  return (
    <>
      <Modal open={open && !confirmOpen} onClose={onClose} title="Request Membership Void" size="wide">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
            {memberPhoto ? (
              <img
                src={memberPhoto}
                alt=""
                className="size-16 rounded-full object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-slate-700 text-lg font-semibold text-white">
                {memberName.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-white">{memberName}</p>
              <p className="text-sm text-slate-400">Member ID: {memberCode}</p>
              <p className="text-xs text-slate-500">Membership #{membership.id}</p>
            </div>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Membership plan</dt>
              <dd className="font-medium text-slate-100">{membership.planName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Period</dt>
              <dd className="font-medium text-slate-100">
                {formatDate(membership.startDate)} – {formatDate(membership.endDate)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Membership amount</dt>
              <dd className="tabular-nums font-medium text-slate-100">
                {formatInr(financial?.membershipFee ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Total paid</dt>
              <dd className="tabular-nums font-medium text-emerald-300">
                {formatInr(financial?.totalPaid ?? 0)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Outstanding amount</dt>
              <dd className="tabular-nums font-medium text-amber-200">
                {formatInr(financial?.outstandingBalance ?? 0)}
              </dd>
            </div>
          </dl>

          {hasPayments ? (
            <div
              role="alert"
              className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            >
              This membership contains payment records. Deletion is prohibited. An approval request will
              be sent to Admin.
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Reason for void <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              placeholder="Explain why this membership should be voided…"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={handleSubmitClick}>
              Submit request
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm void request"
        size="sm"
      >
        <p className="mb-4 text-sm text-slate-300">
          Submit this void request to admin? The membership will not be deleted; it will move to
          pending void until approved.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            Submit request
          </Button>
        </div>
      </Modal>
    </>
  )
}
