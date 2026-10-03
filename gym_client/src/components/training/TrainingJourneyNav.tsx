import { Link, useLocation } from 'react-router-dom'
import {
  getTrainingJourneySteps,
  trainingJourneyStepFromPath,
} from '../../features/auth/trainingNav'

/** Plan → Assign → Monitor → Review chrome on primary training screens. */
export function TrainingJourneyNav() {
  const { pathname } = useLocation()
  const steps = getTrainingJourneySteps()
  const current = trainingJourneyStepFromPath(pathname)

  return (
    <nav
      aria-label="Training journey"
      data-testid="training-journey-nav"
      className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 sm:px-4"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Coaching journey
      </p>
      <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {steps.map((step, index) => {
          const active = step.id === current
          return (
            <li key={step.id} className="flex items-center gap-1.5 sm:gap-2">
              {index > 0 ? (
                <span className="text-slate-600" aria-hidden>
                  →
                </span>
              ) : null}
              <Link
                to={step.path}
                aria-current={active ? 'step' : undefined}
                className={`rounded-lg px-2.5 py-1 text-sm font-medium transition ${
                  active
                    ? 'bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
              >
                {step.label}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
