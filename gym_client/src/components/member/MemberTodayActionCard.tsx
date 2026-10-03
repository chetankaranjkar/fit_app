import { Link } from 'react-router-dom'
import type { MemberTodayAction } from '../../lib/memberPortalNextAction'

export function MemberTodayActionCard({ action }: { action: MemberTodayAction }) {
  return (
    <section
      data-testid="member-today-action"
      data-action-kind={action.kind}
      className="rounded-3xl border border-orange-400/25 bg-gradient-to-br from-orange-500/15 via-amber-500/5 to-transparent p-5 sm:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200/80">Today’s next action</p>
      <h2 className="mt-2 text-xl font-bold text-white">{action.title}</h2>
      <p className="mt-1 text-sm text-slate-300">{action.detail}</p>
      <Link
        to={action.href}
        className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-black"
      >
        {action.cta}
      </Link>
    </section>
  )
}
