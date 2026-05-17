import { Link } from 'react-router-dom'

export type OnboardingStep = {
  id: 'profile' | 'membership' | 'workout' | 'diet'
  label: string
  done: boolean
  hint: string
  action?: { label: string; onClick?: () => void; to?: string }
}

export function UserOnboardingChecklist({
  steps,
  loading,
}: {
  steps: OnboardingStep[]
  loading?: boolean
}) {
  const doneCount = steps.filter((s) => s.done).length
  const allDone = doneCount === steps.length

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
      <div>
        <h2 className="text-sm font-semibold text-white">Member onboarding</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          {loading
            ? 'Checking setup…'
            : allDone
              ? 'All set — this member is ready to train.'
              : `${doneCount} of ${steps.length} complete`}
        </p>
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-3">
            <span
              className={[
                'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                step.done
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-white/5 text-slate-500 ring-1 ring-white/10',
              ].join(' ')}
              aria-hidden
            >
              {step.done ? '✓' : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${step.done ? 'text-slate-400 line-through' : 'text-white'}`}>
                {step.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{step.hint}</p>
              {!step.done && step.action && (
                <div className="mt-2">
                  {step.action.to ? (
                    <Link
                      to={step.action.to}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                    >
                      {step.action.label} →
                    </Link>
                  ) : step.action.onClick ? (
                    <button
                      type="button"
                      onClick={step.action.onClick}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                    >
                      {step.action.label} →
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
