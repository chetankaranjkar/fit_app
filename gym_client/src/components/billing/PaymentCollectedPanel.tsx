import { Button } from '../ui/Button'
import { formatInr } from '../../lib/formatInr'
import { paymentMethodLabel } from './membershipPaymentUi'
import type { PaymentReceiptData } from './PaymentReceiptModal'

/** Shown after a successful collection so staff can reopen the receipt before leaving the page. */
export function PaymentCollectedPanel({
  receipt,
  fullySettled,
  onViewReceipt,
  onDone,
  doneLabel = 'Back to member',
}: {
  receipt: PaymentReceiptData
  fullySettled: boolean
  onViewReceipt: () => void
  onDone?: () => void
  doneLabel?: string
}) {
  return (
    <section
      className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 backdrop-blur-md sm:p-6"
      data-testid="payment-collected"
      role="status"
    >
      <h2 className="text-sm font-semibold text-emerald-100">
        {fullySettled ? 'Full payment recorded' : 'Partial payment recorded'}
      </h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-emerald-200/70">Receipt</dt>
          <dd className="font-mono font-semibold text-white" data-testid="collected-receipt-number">
            {receipt.receiptNumber}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-emerald-200/70">Amount paid</dt>
          <dd className="font-semibold tabular-nums text-white" data-testid="collected-amount">
            {formatInr(receipt.amountPaid)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-emerald-200/70">Method</dt>
          <dd className="text-white">{paymentMethodLabel(receipt.paymentMethod)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-emerald-200/70">Remaining balance</dt>
          <dd className="font-semibold tabular-nums text-white" data-testid="collected-balance">
            {formatInr(receipt.remainingBalance)}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onViewReceipt}>
          View receipt
        </Button>
        {onDone ? (
          <Button type="button" onClick={onDone}>
            {doneLabel}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
