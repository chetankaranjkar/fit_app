import { formatInr } from '../../lib/formatInr'

export interface MembershipFinancialSummaryProps {
  membershipFee: number
  couponDiscount: number
  approvedWaiveOff: number
  netPayable: number
  totalPaid: number
  outstandingBalance: number
  isOverdue?: boolean
  className?: string
}

function balanceTone(outstanding: number, isOverdue?: boolean) {
  if (outstanding <= 0.02) return 'emerald'
  if (isOverdue) return 'rose'
  return 'amber'
}

export function MembershipFinancialSummaryCard({
  membershipFee,
  couponDiscount,
  approvedWaiveOff,
  netPayable,
  totalPaid,
  outstandingBalance,
  isOverdue,
  className = '',
}: MembershipFinancialSummaryProps) {
  const tone = balanceTone(outstandingBalance, isOverdue)
  const toneBorder =
    tone === 'emerald'
      ? 'border-emerald-500/40'
      : tone === 'rose'
        ? 'border-rose-500/40'
        : 'border-amber-500/40'
  const toneBg =
    tone === 'emerald'
      ? 'bg-emerald-500/10'
      : tone === 'rose'
        ? 'bg-rose-500/10'
        : 'bg-amber-500/10'
  const toneText =
    tone === 'emerald'
      ? 'text-emerald-200'
      : tone === 'rose'
        ? 'text-rose-200'
        : 'text-amber-200'

  const statusLabel =
    outstandingBalance <= 0.02 ? 'Fully paid' : isOverdue ? 'Overdue' : 'Outstanding'

  return (
    <div
      className={`rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/50 p-4 shadow-lg ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Financial summary</h4>
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${toneBorder} ${toneBg} ${toneText}`}>
          {statusLabel}
        </span>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between text-slate-300 sm:flex-col sm:gap-0.5">
          <dt>Membership fee</dt>
          <dd className="font-medium tabular-nums">{formatInr(membershipFee)}</dd>
        </div>
        <div className="flex justify-between text-emerald-300 sm:flex-col sm:gap-0.5">
          <dt>Coupon discount</dt>
          <dd className="tabular-nums">−{formatInr(couponDiscount)}</dd>
        </div>
        <div className="flex justify-between text-violet-300 sm:flex-col sm:gap-0.5">
          <dt>Approved waive-off</dt>
          <dd className="tabular-nums">−{formatInr(approvedWaiveOff)}</dd>
        </div>
        <div className="flex justify-between font-semibold text-white sm:flex-col sm:gap-0.5">
          <dt>Net payable</dt>
          <dd className="tabular-nums">{formatInr(netPayable)}</dd>
        </div>
        <div className="flex justify-between text-blue-200/90 sm:flex-col sm:gap-0.5">
          <dt>Total paid</dt>
          <dd className="tabular-nums">{formatInr(totalPaid)}</dd>
        </div>
        <div
          className={`flex justify-between rounded-lg border px-2 py-1 sm:col-span-2 ${toneBorder} ${toneBg} ${toneText}`}
        >
          <dt className="font-medium">Outstanding balance</dt>
          <dd className="font-bold tabular-nums">{formatInr(outstandingBalance)}</dd>
        </div>
      </dl>
    </div>
  )
}
