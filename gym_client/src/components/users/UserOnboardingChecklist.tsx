import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getNextOnboardingStep,
  getOnboardingProgress,
  type OnboardingStep,
  type OnboardingStepAction,
  type OnboardingStepStatus,
} from '../../lib/memberOnboarding'

export type { OnboardingStep } from '../../lib/memberOnboarding'

const STATUS_CHIP: Record<OnboardingStepStatus, { label: string; className: string }> = {
  done: { label: 'Complete', className: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30' },
  attention: { label: 'Needs attention', className: 'bg-amber-500/15 text-amber-300 ring-amber-400/30' },
  todo: { label: 'To do', className: 'bg-white/5 text-slate-300 ring-white/15' },
  blocked: { label: 'Locked', className: 'bg-white/5 text-slate-500 ring-white/10' },
}

const STATUS_MARKER: Record<OnboardingStepStatus, string> = {
  done: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40',
  attention: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40',
  todo: 'bg-white/5 text-slate-300 ring-1 ring-white/20',
  blocked: 'bg-white/5 text-slate-600 ring-1 ring-white/10',
}

function StepActionLink({ action, emphasized }: { action: OnboardingStepAction; emphasized?: boolean }) {
  const className = emphasized
    ? 'inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500'
    : 'text-xs font-semibold text-blue-400 hover:text-blue-300'
  if (action.to) {
    return (
      <Link to={action.to} className={className}>
        {action.label} →
      </Link>
    )
  }
  if (action.onClick) {
    return (
      <button type="button" onClick={action.onClick} className={className}>
        {action.label} →
      </button>
    )
  }
  return null
}

export function UserOnboardingChecklist({
  steps,
  loading,
  aside,
  defaultExpanded = false,
}: {
  steps: OnboardingStep[]
  loading?: boolean
  aside?: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const checklistId = useId()
  const progress = getOnboardingProgress(steps)
  const requiredDone = progress.requiredDone === progress.requiredTotal
  const allDone = requiredDone && progress.optionalDone === progress.optionalTotal
  const next = loading ? null : getNextOnboardingStep(steps)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur" data-testid="member-onboarding">
      <div className={`grid items-start gap-4 ${aside ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]' : ''}`}>
        <div className="contents">
          <div className={`flex flex-wrap items-center justify-between gap-3 ${aside ? 'lg:col-span-2' : ''}`}>
            <div>
            <h2 className="text-sm font-semibold text-white">Member onboarding</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {loading
                ? 'Checking setup…'
                : allDone
                  ? 'All set — this member is ready to train.'
                  : `Required ${progress.requiredDone} of ${progress.requiredTotal} · Optional ${progress.optionalDone} of ${progress.optionalTotal}`}
            </p>
            </div>
            <button type="button" aria-expanded={expanded} aria-controls={checklistId}
              onClick={() => setExpanded((value) => !value)}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">
              {expanded ? 'Hide checklist' : 'Show checklist'}
            </button>
          </div>

          {next && (
            <div
              className={[
                'flex min-h-24 min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
                next.status === 'attention' ? 'border-amber-400/30 bg-amber-500/10' : 'border-blue-400/25 bg-blue-500/10',
              ].join(' ')}
              data-testid="member-onboarding-next"
              data-status={next.status}
            >
              <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {requiredDone ? 'Ready to train · next optional step' : 'Next step'}
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {next.label}
                <span className="ml-2 text-xs font-normal text-slate-400">{next.hint}</span>
              </p>
              </div>
              {next.action && (
                <div className="shrink-0">
                  <StepActionLink action={next.action} emphasized />
                </div>
              )}
            </div>
          )}

          {aside ? <aside className={`min-w-0 w-full ${next ? '' : 'lg:col-span-2'}`}>{aside}</aside> : null}

          <ol id={checklistId} hidden={!expanded} className={expanded ? `grid gap-4 sm:grid-cols-2 ${aside ? 'lg:col-span-2' : ''}` : 'hidden'}>
            {steps.map((step, index) => {
              const chip = STATUS_CHIP[step.status]
              const isNext = next?.id === step.id
              return (
                <li key={step.id} className="flex gap-3" data-step={step.id} data-status={step.status}>
                  <span
                    className={[
                      'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      STATUS_MARKER[step.status],
                    ].join(' ')}
                    aria-hidden
                  >
                    {step.status === 'done' ? '✓' : step.status === 'attention' ? '!' : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          step.status === 'done' ? 'text-slate-400' : step.status === 'blocked' ? 'text-slate-500' : 'text-white'
                        }`}
                      >
                        {step.label}
                      </p>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          step.required ? 'bg-blue-500/15 text-blue-300' : 'bg-white/5 text-slate-500'
                        }`}
                      >
                        {step.required ? 'Required' : 'Optional'}
                      </span>
                      {!loading && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${chip.className}`}>
                          {chip.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {step.status === 'blocked' && step.blockedReason ? step.blockedReason : step.hint}
                    </p>
                    {!loading && !isNext && step.status !== 'done' && step.status !== 'blocked' && step.action && (
                      <div className="mt-2">
                        <StepActionLink action={step.action} />
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
