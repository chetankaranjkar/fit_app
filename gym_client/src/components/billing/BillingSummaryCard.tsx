import { formatInr } from '../../lib/formatInr'

export interface BillingSummaryProps {
  membershipAmount: number
  couponCode?: string | null
  couponDiscount?: number
  manualDiscount?: number
  waiverAmount?: number
  finalBilling: number
  paidAmount: number
  pendingAmount: number
  couponLocked?: boolean
  className?: string
}

export function BillingSummaryCard({
  membershipAmount,
  couponCode,
  couponDiscount = 0,
  manualDiscount = 0,
  waiverAmount = 0,
  finalBilling,
  paidAmount,
  pendingAmount,
  couponLocked,
  className = '',
}: BillingSummaryProps) {
  const hasCoupon = couponDiscount > 0 || !!couponCode

  return (
    <div
      className={`rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-4 shadow-lg transition-all duration-300 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Billing summary</h4>
        {couponLocked && (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
            Coupon locked
          </span>
        )}
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between text-slate-300">
          <dt>Membership amount</dt>
          <dd className="font-medium tabular-nums">{formatInr(membershipAmount)}</dd>
        </div>
        {hasCoupon && (
          <div className="flex justify-between text-emerald-300">
            <dt>
              Coupon discount
              {couponCode ? (
                <span className="ml-1 font-mono text-xs text-emerald-200/80">({couponCode})</span>
              ) : null}
            </dt>
            <dd className="font-medium tabular-nums">−{formatInr(couponDiscount)}</dd>
          </div>
        )}
        {manualDiscount > 0 && (
          <div className="flex justify-between text-slate-400">
            <dt>Other discount</dt>
            <dd className="tabular-nums">−{formatInr(manualDiscount)}</dd>
          </div>
        )}
        {waiverAmount > 0 && (
          <div className="flex justify-between text-slate-400">
            <dt>Waiver</dt>
            <dd className="tabular-nums">−{formatInr(waiverAmount)}</dd>
          </div>
        )}
        <div className="border-t border-white/10 pt-2">
          <div className="flex justify-between font-semibold text-white">
            <dt>Final billing</dt>
            <dd className="tabular-nums">{formatInr(finalBilling)}</dd>
          </div>
        </div>
        <div className="flex justify-between text-blue-200/90">
          <dt>Paid amount</dt>
          <dd className="tabular-nums">{formatInr(paidAmount)}</dd>
        </div>
        <div className="flex justify-between text-amber-200">
          <dt>Pending amount</dt>
          <dd className="font-semibold tabular-nums">{formatInr(pendingAmount)}</dd>
        </div>
      </dl>
    </div>
  )
}
