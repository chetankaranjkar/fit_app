import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { MembershipFinancialSummaryCard } from './MembershipFinancialSummaryCard'
import { formatInr } from '../../lib/formatInr'
import type { MembershipFinancialSummary } from '../../types/membershipPayment'

export interface PaymentConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  confirming?: boolean
  memberName: string
  memberId: string
  memberPhotoUrl?: string | null
  planName?: string | null
  summary: MembershipFinancialSummary
  paymentAmount: number
}

export function PaymentConfirmationModal({
  open,
  onClose,
  onConfirm,
  confirming,
  memberName,
  memberId,
  memberPhotoUrl,
  planName,
  summary,
  paymentAmount,
}: PaymentConfirmationModalProps) {
  const balanceAfter = Math.max(0, summary.outstandingBalance - paymentAmount)

  return (
    <Modal open={open} onClose={onClose} title="Confirm payment" size="wide">
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          {memberPhotoUrl ? (
            <img
              src={memberPhotoUrl}
              alt=""
              className="size-16 rounded-full border border-white/15 object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-slate-300">
              {memberName.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-white">{memberName}</p>
            <p className="text-sm text-slate-400">Member ID: {memberId}</p>
            {planName && <p className="mt-1 text-sm text-slate-300">Plan: {planName}</p>}
          </div>
        </div>

        <MembershipFinancialSummaryCard
          membershipFee={summary.membershipFee}
          couponDiscount={summary.couponDiscount}
          approvedWaiveOff={summary.approvedWaiveOff}
          netPayable={summary.netPayableAmount}
          totalPaid={summary.totalPaid}
          outstandingBalance={summary.outstandingBalance}
          isOverdue={summary.isOverdue}
        />

        <div className="grid gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-200/80">Payment amount</p>
            <p className="text-xl font-bold tabular-nums text-white">{formatInr(paymentAmount)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-200/80">Balance after payment</p>
            <p className="text-xl font-bold tabular-nums text-white">{formatInr(balanceAfter)}</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={confirming}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={confirming}>
            {confirming ? 'Processing…' : 'Confirm payment'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
