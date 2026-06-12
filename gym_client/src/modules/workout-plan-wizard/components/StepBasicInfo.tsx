import type { WizardBasicInfo } from '../types'
import { DURATION_OPTIONS } from '../types'

const GOALS = ['Muscle Gain', 'Fat Loss', 'Strength', 'Mobility', 'Endurance', 'HIIT', 'Athletic Performance', 'Beginner Fitness']
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

interface Props {
  value: WizardBasicInfo
  categories: Array<{ id: number; name: string }>
  onChange: (patch: Partial<WizardBasicInfo>) => void
}

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20'

export function StepBasicInfo({ value, categories, onChange }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
        <h2 className="text-lg font-semibold text-white">Basic information</h2>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Plan name
          <input
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={`mt-1 ${selectClass}`}
            placeholder="e.g. 90 Day Muscle Builder"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Description
          <textarea
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            className={`mt-1 resize-none ${selectClass}`}
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Goal
          <select value={value.goal} onChange={(e) => onChange({ goal: e.target.value })} className={`mt-1 ${selectClass}`}>
            {GOALS.map((g) => (
              <option key={g} value={g} className="bg-slate-900 text-slate-100">
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Difficulty
          <select
            value={value.difficultyLevel}
            onChange={(e) => onChange({ difficultyLevel: e.target.value })}
            className={`mt-1 ${selectClass}`}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d} className="bg-slate-900 text-slate-100">
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
        <h2 className="text-lg font-semibold text-white">Duration & template</h2>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Duration (days)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChange({ durationDays: d })}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  value.durationDays === d
                    ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Workouts per week
          <input
            type="number"
            min={1}
            max={7}
            value={value.workoutsPerWeek}
            onChange={(e) => onChange({ workoutsPerWeek: Number(e.target.value) || 3 })}
            className={`mt-1 ${selectClass}`}
          />
        </label>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Template mode</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(
              [
                ['SIMPLE', 'Simple', 'One week template repeats for the full plan'],
                ['ADVANCED', 'Advanced', 'Week A–D cycle (2–4 template weeks)'],
              ] as const
            ).map(([mode, title, hint]) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  onChange({
                    templateMode: mode,
                    templateWeekCount: mode === 'SIMPLE' ? 1 : Math.max(2, value.templateWeekCount),
                  })
                }
                className={`rounded-xl border p-3 text-left transition ${
                  value.templateMode === mode
                    ? 'border-sky-400/50 bg-sky-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs text-slate-400">{hint}</p>
              </button>
            ))}
          </div>
        </div>
        {value.templateMode === 'ADVANCED' && (
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Template weeks (2–4)
            <input
              type="number"
              min={2}
              max={4}
              value={value.templateWeekCount}
              onChange={(e) => onChange({ templateWeekCount: Math.min(4, Math.max(2, Number(e.target.value) || 2)) })}
              className={`mt-1 ${selectClass}`}
            />
          </label>
        )}
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Workout category
          <select
            value={value.workoutCategoryId}
            onChange={(e) => onChange({ workoutCategoryId: Number(e.target.value) })}
            className={`mt-1 ${selectClass}`}
          >
            <option value={0} className="bg-slate-900 text-slate-100">
              None
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-4 text-sm text-slate-300">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.useDefaultWarmups}
              onChange={(e) => onChange({ useDefaultWarmups: e.target.checked })}
            />
            Use category warmups
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.useDefaultStretches}
              onChange={(e) => onChange({ useDefaultStretches: e.target.checked })}
            />
            Use category stretches
          </label>
        </div>
      </div>
    </div>
  )
}
