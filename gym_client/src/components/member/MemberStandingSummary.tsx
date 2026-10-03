import { Link } from 'react-router-dom'
import { StandingFactValue } from '../memberships/MembershipStandingPanel'
import {
  PAY_OUTSTANDING_LABEL,
  RENEW_MEMBERSHIP_LABEL,
  type MembershipStanding,
} from '../../lib/membershipStanding'

/** Membership facts for members — same standing data as staff, without collect/unfreeze jargon. */
export function MemberStandingSummary({ standing }: { standing: MembershipStanding }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2" data-testid="member-standing-facts">
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Gym access</dt>
        <dd className="mt-1">
          <StandingFactValue fact={standing.access} />
        </dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Membership period</dt>
        <dd className="mt-1">
          <StandingFactValue fact={standing.dates} />
        </dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Payment status</dt>
        <dd className="mt-1">
          <StandingFactValue fact={standing.payment} />
        </dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Outstanding balance</dt>
        <dd className="mt-1">
          <StandingFactValue fact={standing.outstanding} />
        </dd>
      </div>
      {standing.collect.allowed ? (
        <div className="sm:col-span-2">
          <Link
            to="/dashboard/member/pay"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-black sm:w-auto"
          >
            {PAY_OUTSTANDING_LABEL}
          </Link>
          <p className="mt-1 text-xs text-slate-400">
            This settles your current bill. {RENEW_MEMBERSHIP_LABEL} is a separate front-desk step and adds gym time.
          </p>
        </div>
      ) : null}
    </dl>
  )
}
