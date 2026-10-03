import { formatInr } from '../../lib/formatInr'
import './MembershipFinancialSummaryCard.css'

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
  const statusLabel =
    outstandingBalance <= 0.02 ? 'Fully paid' : isOverdue ? 'Overdue' : 'Outstanding'

  return (
    <div
      className={`membership-financial-summary ${className}`}
      data-balance-tone={tone}
    >
      <div className="membership-financial-summary__header">
        <h4>Financial summary</h4>
        <span className="membership-financial-summary__status">
          <span aria-hidden="true" className="membership-financial-summary__status-dot" />
          {statusLabel}
        </span>
      </div>
      <dl className="membership-financial-summary__totals">
        <div className="membership-financial-summary__metric">
          <dt>Net payable</dt>
          <dd>{formatInr(netPayable)}</dd>
        </div>
        <div className="membership-financial-summary__metric membership-financial-summary__metric--paid">
          <dt>Total paid</dt>
          <dd>{formatInr(totalPaid)}</dd>
        </div>
        <div className="membership-financial-summary__metric membership-financial-summary__metric--balance">
          <dt>Outstanding balance</dt>
          <dd>{formatInr(outstandingBalance)}</dd>
        </div>
      </dl>
      <dl className="membership-financial-summary__breakdown">
        <div>
          <dt>Membership fee</dt>
          <dd>{formatInr(membershipFee)}</dd>
        </div>
        <div>
          <dt>Coupon discount</dt>
          <dd>{couponDiscount > 0 ? '−' : ''}{formatInr(couponDiscount)}</dd>
        </div>
        <div>
          <dt>Approved waive-off</dt>
          <dd>{approvedWaiveOff > 0 ? '−' : ''}{formatInr(approvedWaiveOff)}</dd>
        </div>
      </dl>
    </div>
  )
}
