import { useState } from 'react'
import { Modal, modalActionBarClass } from '../ui/Modal'
import { Button } from '../ui/Button'
import { MembershipFinancialSummaryCard } from './MembershipFinancialSummaryCard'
import { paymentMethodLabel } from './membershipPaymentUi'
import { formatInr } from '../../lib/formatInr'
import { formatStandingDate } from '../../lib/membershipStanding'
import type { MembershipFinancialSummary, MembershipPaymentMethod } from '../../types/membershipPayment'

export interface PaymentConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  confirming?: boolean
  memberName: string
  memberId: string
  memberPhone?: string | null
  memberPhotoUrl?: string | null
  planName?: string | null
  periodStart?: string | null
  periodEnd?: string | null
  summary: MembershipFinancialSummary
  paymentAmount: number
  method?: MembershipPaymentMethod
  referenceNumber?: string | null
  /** yyyy-MM-dd; shown for partial installments. */
  nextDueDate?: string | null
  /** Server duplicate-check message; staff must acknowledge before confirming. */
  duplicateWarning?: string | null
  /** Last submission error; entered values stay on screen so staff can retry. */
  error?: string | null
}

const SETTLED_EPSILON = 0.02

export function PaymentConfirmationModal({ open, onClose, ...props }: PaymentConfirmationModalProps) {
  const handleClose = () => {
    if (!props.confirming) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Confirm payment"
      size="wide"
      closeOnBackdropClick={!props.confirming}
      closeOnEscape={!props.confirming}
    >
      {/* Remount per warning so a duplicate acknowledgement never carries over to a new warning. */}
      <PaymentReviewBody key={props.duplicateWarning ?? ''} {...props} onClose={handleClose} />
    </Modal>
  )
}

function PaymentReviewBody({
  onClose,
  onConfirm,
  confirming,
  memberName,
  memberId,
  memberPhone,
  memberPhotoUrl,
  planName,
  periodStart,
  periodEnd,
  summary,
  paymentAmount,
  method,
  referenceNumber,
  nextDueDate,
  duplicateWarning,
  error,
}: Omit<PaymentConfirmationModalProps, 'open'>) {
  const outstandingBefore = summary.outstandingBalance
  const balanceAfter = Math.max(0, outstandingBefore - paymentAmount)
  const isFull = balanceAfter <= SETTLED_EPSILON
  const exceedsOutstanding = paymentAmount - outstandingBefore > SETTLED_EPSILON
  const missingNextDue = !isFull && !nextDueDate
  const [duplicateAck, setDuplicateAck] = useState(false)

  const blocked =
    confirming || paymentAmount <= 0 || exceedsOutstanding || missingNextDue || (Boolean(duplicateWarning) && !duplicateAck)

  return (
    <div className="space-y-5" data-testid="payment-review">
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
        <div className="min-w-0">
          <p className="text-lg font-semibold text-white" data-testid="review-member-name">{memberName}</p>
          <p className="text-sm text-slate-400">
            Member ID: {memberId}
            {memberPhone ? <span className="ml-2">· {memberPhone}</span> : null}
          </p>
          {planName && <p className="mt-1 text-sm text-slate-300">Plan: {planName}</p>}
          {periodStart || periodEnd ? (
            <p className="text-sm text-slate-400" data-testid="review-period">
              Period: {formatStandingDate(periodStart)} – {formatStandingDate(periodEnd)}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-blue-200/80">Outstanding before</dt>
          <dd className="text-lg font-semibold tabular-nums text-white" data-testid="review-outstanding">
            {formatInr(outstandingBefore)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-blue-200/80">Paying now</dt>
          <dd className="text-xl font-bold tabular-nums text-white" data-testid="review-amount">
            {formatInr(paymentAmount)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-blue-200/80">Balance after payment</dt>
          <dd
            className={`text-xl font-bold tabular-nums ${isFull ? 'text-emerald-200' : 'text-amber-200'}`}
            data-testid="review-balance-after"
          >
            {formatInr(balanceAfter)}
          </dd>
        </div>
        {method ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-blue-200/80">Method</dt>
            <dd className="text-sm font-medium text-white" data-testid="review-method">
              {paymentMethodLabel(method)}
              {referenceNumber?.trim() ? (
                <span className="block text-xs text-slate-400">Ref: {referenceNumber.trim()}</span>
              ) : null}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs uppercase tracking-wide text-blue-200/80">Type</dt>
          <dd
            className={`text-sm font-semibold ${isFull ? 'text-emerald-200' : 'text-amber-200'}`}
            data-testid="review-kind"
          >
            {isFull ? 'Full payment — settles the bill' : 'Partial installment'}
          </dd>
        </div>
        {!isFull ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-blue-200/80">Next due date</dt>
            <dd
              className={`text-sm font-medium ${nextDueDate ? 'text-white' : 'text-rose-300'}`}
              data-testid="review-next-due"
            >
              {nextDueDate ? formatStandingDate(nextDueDate) : 'Required for partial payments'}
            </dd>
          </div>
        ) : null}
      </dl>

      <MembershipFinancialSummaryCard
        membershipFee={summary.membershipFee}
        couponDiscount={summary.couponDiscount}
        approvedWaiveOff={summary.approvedWaiveOff}
        netPayable={summary.netPayableAmount}
        totalPaid={summary.totalPaid}
        outstandingBalance={summary.outstandingBalance}
        isOverdue={summary.isOverdue}
      />

      {exceedsOutstanding ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
          Payment amount is more than the outstanding balance. Go back and correct the amount.
        </p>
      ) : null}

      {duplicateWarning ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100" data-testid="review-duplicate-warning">
          <p className="font-medium">{duplicateWarning}</p>
          <label className="mt-2 flex items-center gap-2 text-xs text-amber-100/90">
            <input
              type="checkbox"
              checked={duplicateAck}
              onChange={(e) => setDuplicateAck(e.target.checked)}
              disabled={confirming}
              data-testid="duplicate-ack"
            />
            I checked payment history — this is a new payment, not a repeat.
          </label>
        </div>
      ) : null}

      {error ? (
        <p
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          role="alert"
          data-testid="payment-submit-error"
        >
          {error}
        </p>
      ) : null}

      <div className={modalActionBarClass}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={confirming}>
          {error ? 'Back to edit' : 'Cancel'}
        </Button>
        <Button type="button" onClick={onConfirm} disabled={blocked}>
          {confirming ? 'Processing…' : error ? 'Retry payment' : 'Confirm payment'}
        </Button>
      </div>
    </div>
  )
}
