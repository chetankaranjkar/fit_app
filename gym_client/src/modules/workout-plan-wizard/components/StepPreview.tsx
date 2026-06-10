import type { WizardBasicInfo, WizardPlanSummary, WizardWeekDraft } from '../types'
import { DAY_LABELS } from '../types'

interface Props {
  basic: WizardBasicInfo
  weeks: WizardWeekDraft[]
  summary: WizardPlanSummary
  categoryName?: string
}

export function StepPreview({ basic, weeks, summary, categoryName }: Props) {
  const templateLabel = basic.templateMode === 'SIMPLE' ? 'Simple (1-week repeat)' : `Advanced (${weeks.length} weeks)`

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
        <h2 className="text-lg font-semibold text-white">Plan summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Name</dt>
            <dd className="font-medium text-white">{basic.name || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Goal</dt>
            <dd className="text-white">{basic.goal}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Difficulty</dt>
            <dd className="text-white">{basic.difficultyLevel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Duration</dt>
            <dd className="text-white">{basic.durationDays} days</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Template mode</dt>
            <dd className="text-white">{templateLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Stored template weeks</dt>
            <dd className="text-white">{weeks.length}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Calendar weeks (display)</dt>
            <dd className="text-white">{summary.totalWeeks}</dd>
          </div>
          {categoryName && (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Category</dt>
              <dd className="text-white">{categoryName}</dd>
            </div>
          )}
        </dl>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            ['Exercises', summary.totalExercises],
            ['Warmups', summary.totalWarmups],
            ['Stretches', summary.totalStretches],
            ['Est. min / template', summary.estimatedMinutes],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
        <h2 className="text-lg font-semibold text-white">Weekly schedule (template)</h2>
        <div className="mt-4 space-y-4">
          {weeks.map((w) => (
            <div key={w.weekNumber}>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-300/80">{w.name}</p>
              <ul className="mt-2 space-y-1">
                {w.days.map((d) => (
                  <li key={d.dayNumber} className="flex justify-between text-sm text-slate-300">
                    <span>
                      {DAY_LABELS[d.dayNumber - 1]} — {d.isRestDay || d.focusArea === 'Rest Day' ? 'Rest' : d.focusArea || d.name}
                    </span>
                    <span className="text-slate-500">
                      {d.isRestDay || d.focusArea === 'Rest Day' ? '—' : `${d.exercises.length} ex`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
