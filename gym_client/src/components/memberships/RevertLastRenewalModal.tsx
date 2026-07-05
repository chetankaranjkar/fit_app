import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { userMembershipsService } from '../../services/userMemberships.service'
import { getApiErrorMessage } from '../../lib/apiErrors'
import type { UserMembership } from '../../types/userMembership'

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString()
}

export function RevertLastRenewalModal({
  open,
  membership,
  onClose,
  onReverted,
}: {
  open: boolean
  membership: UserMembership | null
  onClose: () => void
  onReverted: () => void
}) {
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['membership-revert-preview', membership?.id],
    queryFn: () => userMembershipsService.getLastRenewalRevertPreview(membership!.id),
    enabled: open && membership != null && membership.id > 0,
  })

  const revertMutation = useMutation({
    mutationFn: () => userMembershipsService.revertLastRenewal(membership!.id),
    onSuccess: () => {
      toast.success('Last renewal reverted — plan and dates restored.')
      onReverted()
      onClose()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not revert last renewal')),
  })

  if (!membership) return null

  const memberName = membership.userName ?? `User #${membership.userId}`

  return (
    <Modal open={open} onClose={onClose} title="Revert last renewal" size="wide">
      <div className="space-y-5">
        <p className="text-sm text-slate-300">
          Undo the most recent staff renewal on <strong className="text-white">{memberName}</strong>.
          This restores the plan and dates from before that renewal. Payment records are not removed.
        </p>

        {previewLoading ? (
          <p className="text-sm text-slate-500">Loading renewal details…</p>
        ) : !preview ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            No revertible staff renewal found. Only renewals that extended an existing membership
            (with audit history) can be reverted.
          </div>
        ) : (
          <>
            {preview.lastRenewedByName ? (
              <p className="text-xs text-slate-500">
                Last renewed {formatDate(preview.lastRenewedAt)} by {preview.lastRenewedByName}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Current (after renewal)
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-slate-500">Plan</dt>
                    <dd className="font-medium text-slate-100">
                      {preview.currentPlanName ?? `Plan #${preview.currentPlanId}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">End date</dt>
                    <dd className="font-medium text-slate-100">{formatDate(preview.currentEndDate)}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-200/80">
                  Will restore to
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-emerald-200/70">Plan</dt>
                    <dd className="font-medium text-emerald-100">
                      {preview.previousPlanName ?? `Plan #${preview.previousPlanId}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-emerald-200/70">Period</dt>
                    <dd className="font-medium text-emerald-100">
                      {formatDate(preview.previousStartDate)} – {formatDate(preview.previousEndDate)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!preview || revertMutation.isPending || previewLoading}
            isLoading={revertMutation.isPending}
            onClick={() => revertMutation.mutate()}
          >
            Revert last renewal
          </Button>
        </div>
      </div>
    </Modal>
  )
}
