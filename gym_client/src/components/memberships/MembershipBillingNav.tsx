import { Link, NavLink, useLocation } from 'react-router-dom'

const MEMBERSHIP_BILLING_TABS = [
  { to: '/dashboard/user-memberships', label: 'Member plans' },
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

const backLinkClass =
  'inline-flex w-fit items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-200'

/** Shared sub-nav for member plans, payment history, approvals, and related billing pages. */
export function MembershipBillingNav({
  showBackLinks = true,
}: {
  /** Hide back links on the payments hub page itself. */
  showBackLinks?: boolean
}) {
  const location = useLocation()
  const onMemberPlans = location.pathname === '/dashboard/user-memberships'

  return (
    <div className="mb-4 flex flex-col gap-3">
      {showBackLinks && !onMemberPlans ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link to="/dashboard/user-memberships" className={backLinkClass}>
            <span aria-hidden>←</span>
            Back to member plans
          </Link>
          <Link to="/dashboard/payments" className={backLinkClass}>
            <span aria-hidden>←</span>
            Payments hub
          </Link>
        </div>
      ) : null}
      <nav className="flex flex-wrap gap-2" aria-label="Membership billing sections">
        {MEMBERSHIP_BILLING_TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={tabClass}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
