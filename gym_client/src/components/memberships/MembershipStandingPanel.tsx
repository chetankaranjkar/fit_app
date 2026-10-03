import { useId } from 'react'
import { Link } from 'react-router-dom'
import {
  STANDING_TONE_DOT,
  STANDING_TONE_TEXT,
  type MembershipStanding,
  type StandingActionRule,
  type StandingFact,
} from '../../lib/membershipStanding'

const BILLING_ACCESS_NOTE = 'Requires billing access.'

export function StandingFactValue({ fact, compact }: { fact: StandingFact; compact?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={`flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'} font-medium ${STANDING_TONE_TEXT[fact.tone]}`}>
        <span className={`size-1.5 shrink-0 rounded-full ${STANDING_TONE_DOT[fact.tone]}`} aria-hidden />
        <span className={compact ? 'truncate' : undefined} title={compact ? fact.label : undefined}>
          {fact.label}
        </span>
      </p>
      {fact.detail ? (
        <p
          className={`mt-0.5 ${compact ? 'truncate text-[10px]' : 'text-xs'} text-slate-400`}
          title={compact ? fact.detail : undefined}
        >
          {fact.detail}
        </p>
      ) : null}
    </div>
  )
}

type ActionTarget = { onClick?: () => void; to?: string }

function StandingActionButton({
  rule,
  target,
  canManage,
  primary,
  testId,
}: {
  rule: StandingActionRule
  target?: ActionTarget
  canManage: boolean
  primary?: boolean
  testId: string
}) {
  const reasonId = useId()
  const enabled = rule.allowed && canManage && (target?.onClick != null || target?.to != null)
  const className = [
    'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition',
    enabled
      ? primary
        ? 'bg-blue-600 text-white hover:bg-blue-500'
        : 'border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10'
      : 'cursor-not-allowed border border-white/10 bg-white/[0.03] text-slate-500',
  ].join(' ')
  const reason = !rule.allowed ? rule.reason : !canManage ? BILLING_ACCESS_NOTE : undefined

  return (
    <div className="min-w-0" data-testid={testId} data-allowed={enabled ? 'true' : 'false'}>
      {enabled && target?.to ? (
        <Link to={target.to} className={className}>
          {rule.label}
        </Link>
      ) : (
        <button type="button" className={className} disabled={!enabled} aria-describedby={reason ? reasonId : undefined} onClick={enabled ? target?.onClick : undefined}>
          {rule.label}
        </button>
      )}
      {reason ? <p id={reasonId} className="mt-1 max-w-xs text-[11px] leading-snug text-slate-400">{reason}</p> : null}
    </div>
  )
}

/**
 * Access, dates, payment status, and outstanding balance as separate labelled facts, with
 * Collect outstanding payment and Renew membership as distinct actions.
 */
export function MembershipStandingPanel({
  standing,
  canManage,
  collect,
  renew,
  resolve,
  title = 'Membership standing',
  showActions = true,
  className = '',
}: {
  standing: MembershipStanding
  canManage: boolean
  collect?: ActionTarget
  renew?: ActionTarget
  resolve?: ActionTarget
  title?: string
  showActions?: boolean
  className?: string
}) {
  const { next } = standing
  const nextTarget = next.kind === 'collect' ? collect : next.kind === 'renew' ? renew : next.kind === 'resolve' ? resolve : undefined
  const nextActionable = canManage && nextTarget != null && (nextTarget.onClick != null || nextTarget.to != null)

  return (
    <section
      className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 ${className}`}
      data-testid="membership-standing"
      data-status={standing.status ?? 'none'}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        {standing.planName ? <p className="text-xs text-slate-400">{standing.planName}</p> : null}
      </div>

      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div data-testid="standing-access">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Gym access</dt>
          <dd className="mt-1">
            <StandingFactValue fact={standing.access} />
          </dd>
        </div>
        <div data-testid="standing-dates">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Membership dates</dt>
          <dd className="mt-1">
            <StandingFactValue fact={standing.dates} />
          </dd>
        </div>
        <div data-testid="standing-payment">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Payment status</dt>
          <dd className="mt-1">
            <StandingFactValue fact={standing.payment} />
          </dd>
        </div>
        <div data-testid="standing-outstanding">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Outstanding balance</dt>
          <dd className="mt-1">
            <StandingFactValue fact={standing.outstanding} />
          </dd>
        </div>
      </dl>

      {showActions ? (
        <>
          <div
            className={`mt-4 rounded-lg border px-3 py-2 ${
              next.kind === 'none' ? 'border-white/10 bg-white/[0.02]' : 'border-blue-400/25 bg-blue-500/10'
            }`}
            data-testid="standing-next"
            data-kind={next.kind}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Next step</p>
            <p className="mt-0.5 text-sm text-white">
              {next.label}
              <span className="ml-2 text-xs text-slate-400">{next.detail}</span>
            </p>
            {next.kind !== 'none' && !nextActionable && !canManage ? (
              <p className="mt-0.5 text-xs text-slate-500">Staff with billing access can do this.</p>
            ) : null}
            {next.kind === 'resolve' && nextActionable && nextTarget ? (
              <div className="mt-2">
                {nextTarget.to ? (
                  <Link to={nextTarget.to} className="text-xs font-semibold text-blue-300 hover:text-blue-200">
                    {next.label} →
                  </Link>
                ) : (
                  <button type="button" onClick={nextTarget.onClick} className="text-xs font-semibold text-blue-300 hover:text-blue-200">
                    {next.label} →
                  </button>
                )}
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-start gap-3">
            <StandingActionButton
              rule={standing.collect}
              target={collect}
              canManage={canManage}
              primary={next.kind === 'collect'}
              testId="standing-collect"
            />
            <StandingActionButton
              rule={standing.renew}
              target={renew}
              canManage={canManage}
              primary={next.kind === 'renew'}
              testId="standing-renew"
            />
          </div>
        </>
      ) : null}
    </section>
  )
}
