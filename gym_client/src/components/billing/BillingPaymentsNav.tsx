import { Link, NavLink } from 'react-router-dom'

const BILLING_TABS = [
  { to: '/dashboard/payments/history', label: 'Payment history' },
  { to: '/dashboard/payments/waive-offs', label: 'Waive-off requests' },
  { to: '/dashboard/payments/membership-approvals', label: 'Membership approvals' },
  { to: '/dashboard/payments/reports', label: 'Billing reports' },
] as const

const tabClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-xl border px-3 py-1.5 text-xs font-medium transition',
    isActive
      ? 'border-blue-400/50 bg-blue-500/20 text-blue-100'
      : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
  ].join(' ')

/** Shared billing sub-nav (payment history, waive-offs, approvals, reports). */
export function BillingPaymentsNav({ showBack = true }: { showBack?: boolean }) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      {showBack ? (
        <Link
          to="/dashboard/payments"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-200"
        >
          <span aria-hidden>←</span>
          Back to payments
        </Link>
      ) : null}
      <nav className="flex flex-wrap gap-2" aria-label="Billing sections">
        {BILLING_TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={tabClass}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
